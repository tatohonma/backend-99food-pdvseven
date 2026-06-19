import { criarPedido } from "../repositories/pedido.js";
import { configuracoes } from "../config/pdv7.js";
import { v4 as uuidv4 } from "uuid";
import { atualizarValorTag, criarTag } from "../repositories/tag.js";
import {
  procurarTagGUIDChave,
  procurarTagChaveValor,
} from "../repositories/tag.js";
import { api } from "../config/axios.js";

const montarObservacaoCupom = (pedido) => {
  const PROMO_TYPE_MAP = {
    0: "",
    1: "Minimum Order Discount",
    2: "Sale Item Promotion",
    3: "Free Delivery Event",
    4: "Buy X Get Y Promotion",
    5: "Buy More, Save More",
    10: "Overall Order Coupon",
    11: "Order Items Coupon",
    12: "Delivery Coupon",
    20: "Delivery Member Discount",
    30: "Share Delivery Discount",
    34: "Didi Membership Discount",
    100: "New User Discount",
    101: "Recurrent User Discount",
  };

  const code = `***Pedido 99Food ${pedido?.pickup_code}***\n`;

  const descounts = pedido.promotions.map((p) => {
    return p.promo_type != 0
      ? `${PROMO_TYPE_MAP[p.promo_type]} R$ ${p.promo_discount / 100}\n`
      : "";
  });

  return code + descounts;
};

export const adicionarPedido = async (pedido, idCliente) => {
  const idTipoDesconto = configuracoes.tipoDesconto.IDTipoDesconto;
  const idTaxaEntrega = configuracoes.taxaEntrega.IDTaxaEntrega;
  const idOrigemPedido = configuracoes.origemPedido.IDOrigemPedido;
  const idEntregador = configuracoes.entregador.IDEntregador;

  const valorDesconto = pedido.price.items_discount;

  const observacoes = "";
  const aplicarDesconto = valorDesconto > 0 ? 1 : 0;
  const observacaoCupom = montarObservacaoCupom(pedido);
  const taxaServicoPadrao = 0;

  const guid = uuidv4();

  const result = await criarPedido({
    aplicarDesconto,
    taxaServicoPadrao,
    idTaxaEntrega,
    idTipoDesconto,
    idOrigemPedido,
    idEntregador,
    idCliente,
    guid,
    observacaoCupom,
    valorDesconto,
    observacoes,
    valorTotal: pedido.price.order_price / 100,
    valorEntrega: pedido.store_charged_delivery_price / 100,
    // IDRetornoSatVenda
  });

  const tags = [
    { chave: "99Food-orderId", valor: pedido.order_id },
    { chave: "99Food-shortReference", valor: pedido.order_index },
    { chave: "99Food-Type", valor: pedido.delivery_type },
    { chave: "99Food-status", valor: pedido.status },
  ];

  for (const tag of tags) {
    await criarTag({
      GUID: guid,
      chave: tag.chave,
      valor: tag.valor.toString(),
    });
  }

  console.log("✅ tags do pedido adicionadas com sucesso.");
  return result;
};

export const sincronisarStatus = async ({ pedido }) => {
  // 100	Order created
  // 200	Order accepted (The store sent confirmation)
  // 400	The rider took the order for delivery
  // 500	The rider arrived at the customer's location
  // 600	Order finished, completed
  // 901, 902	Cancelation -- Cancelled by the customer
  // 921, 923	Cancelation -- Cancelled by the store (after receiving the order)
  // 922	Cancelation -- Cancelled by the store due to timeout (Not confirmed order acceptance within the permitted timeframe)
  // 961	Cancelation -- Cancelled by 99Food customer service due to request of the customer
  // 971, 981	Cancelation-- Cancelled by courier

  const STATUS_PDV_99FOOD = {
    10: [200], // Em produção
    20: [400], // Pronto
    40: [600], // Finalizado (Pedido concluído)
    50: [901, 902, 921, 923, 922, 961, 971, 981], // Negado/Cancelado
    60: [100], // Em análise
  };

  const STATUS_PDV = {
    10: "aberto",
    20: "enviado",
    40: "finalizado",
    50: "cancelado",
    60: "nao-confirmado",
  };

  const tag = await procurarTagGUIDChave({
    chave: "99Food-orderId",
    GUID: pedido.GUIDIdentificacao,
  });

  const detalhesDoPedido = await api.get("/order/order/detail", {
    params: { order_id: tag.Valor },
  });

  // Se não incluir os status estão dessincronizados
  const statusPedidoDessinconizado = !STATUS_PDV_99FOOD[
    pedido.IDStatusPedido
  ].includes(detalhesDoPedido.data.data.status);

  const statusPedidoNoPdv = STATUS_PDV[pedido.IDStatusPedido];

  if (statusPedidoDessinconizado) {
    if (statusPedidoNoPdv === "aberto") {
      console.log("Confirmando pedido - 99Food");

      await api.post("/order/order/confirm", null, {
        params: {
          order_id: tag.Valor,
        },
      });

      await atualizarValorTag({
        GUID: pedido.GUIDIdentificacao,
        chave: "99Food-status",
        valor: 200,
      });

      return;
    }

    if (statusPedidoNoPdv === "enviado") {
      console.log("Pedido pronto - 99Food");

      await api.post("/order/order/ready", null, {
        params: {
          order_id: tag.Valor,
        },
      });

      await atualizarValorTag({
        GUID: pedido.GUIDIdentificacao,
        chave: "99Food-status",
        valor: 400,
      });

      return;
    }

    if (statusPedidoNoPdv === "cancelado") {
      console.log("Cancelando pedido - 99Food");

      await api.post("/order/order/cancel", null, {
        params: {
          order_id: tag.Valor,
          reason_id: 1080,
          reason: "Cancelado pelo PDV",
        },
      });

      await atualizarValorTag({
        GUID: pedido.GUIDIdentificacao,
        chave: "99Food-status",
        valor: 921,
      });

      return;
    }
  }

  return;
};

export const verificarExistenciaPedido = async ({ orderId }) => {
  return await procurarTagChaveValor({
    chave: "99Food-orderId",
    valor: orderId,
  });
};
