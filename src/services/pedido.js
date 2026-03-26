import { criarPedido } from "../repositories/pedido.js";
import { configuracoes } from "../config/pdv7.js";
import { v4 as uuidv4 } from "uuid";
import { atualizarValorTag, criarTag } from "../repositories/tag.js";
import { procurarTagGUIDChave } from "../repositories/tag.js";
import { api } from "../config/axios.js";

export const adicionarPedido = async (pedido, idCliente) => {
  const idTipoDesconto = configuracoes.tipoDesconto.IDTipoDesconto;
  const idTaxaEntrega = configuracoes.taxaEntrega.IDTaxaEntrega;
  const idOrigemPedido = configuracoes.origemPedido.IDOrigemPedido;
  const idEntregador = configuracoes.entregador.IDEntregador;

  const valorDesconto = pedido.order_info.price.items_discount;

  const observacoes = "";
  const aplicarDesconto = valorDesconto > 0 ? 1 : 0;
  const observacaoCupom = "";
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
    valorTotal: pedido.order_info.price.order_price / 100,
    valorEntrega: pedido.order_info.store_charged_delivery_price / 100,
    // IDRetornoSatVenda
  });

  const tags = [
    { chave: "99Food-orderId", valor: pedido.order_info.order_id },
    { chave: "99Food-shortReference", valor: pedido.order_info.order_index },
    { chave: "99Food-Type", valor: pedido.order_info.delivery_type },
    { chave: "99Food-status", valor: pedido.order_info.status },
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
