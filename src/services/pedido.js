import {
  atualizarStatusPedido,
  criarPedido,
  procurarMotivoCancelamentoPedido,
} from "../repositories/pedido.js";
import { configuracoes } from "../config/pdv7.js";
import { v4 as uuidv4 } from "uuid";
import { atualizarValorTag, criarTag } from "../repositories/tag.js";
import {
  procurarTagGUIDChave,
  procurarTagChaveValor,
} from "../repositories/tag.js";
import { api } from "../config/axios.js";

const montarObservacaoCupom = (pedido) => {
  // const PROMO_TYPE_MAP = {
  //   0: "",
  //   1: "Minimum Order Discount",
  //   2: "Sale Item Promotion",
  //   3: "Free Delivery Event",
  //   4: "Buy X Get Y Promotion",
  //   5: "Buy More, Save More",
  //   10: "Overall Order Coupon",
  //   11: "Order Items Coupon",
  //   12: "Delivery Coupon",
  //   20: "Delivery Member Discount",
  //   30: "Share Delivery Discount",
  //   34: "Didi Membership Discount",
  //   100: "New User Discount",
  //   101: "Recurrent User Discount",
  // };

  const descounts = pedido.promotions.reduce(
    (acc, p) => {
      acc.shop_subside_price += p.shop_subside_price || 0;
      acc.promo_discount += p.promo_discount || 0;
      return acc;
    },
    {
      shop_subside_price: 0,
      promo_discount: 0,
    },
  );

  const code = `***Pedido 99Food ${pedido?.pickup_code}***\n`;
  const orderId = `ID do Pedido: ${pedido?.order_index}\n`;
  const localizador = pedido?.receive_address?.locator
    ? `Localizador: ${pedido.receive_address.locator}\n`
    : "";
  const codigoRetirada = pedido?.handover_code
    ? `Código de Retirada: ${pedido.handover_code}\n`
    : "";

  const msgDesconsto = ` Incentivo 99Food R$ ${(descounts.promo_discount - descounts.shop_subside_price) / 100}
  Incentivo Estabelecimento R$ ${descounts.shop_subside_price / 100}`;

  // const localizador = `Localizador: ${pedido?.locator}\n`;

  // const descounts = pedido.promotions.map((p) => {
  //   return p.promo_type != 0
  //     ? `${PROMO_TYPE_MAP[p.promo_type]} R$ ${p.promo_discount / 100}\n`
  //     : "";
  // });

  return code + orderId + localizador + codigoRetirada + msgDesconsto;
};

export const adicionarPedido = async (pedido, idCliente) => {
  const idTipoDesconto = configuracoes.tipoDesconto.IDTipoDesconto;
  const idTaxaEntrega = configuracoes.taxaEntrega.IDTaxaEntrega;
  const idOrigemPedido = configuracoes.origemPedido.IDOrigemPedido;
  const idEntregador = configuracoes.entregador.IDEntregador;

  const valorDesconto = pedido.promotions.reduce((sum, item) => {
    return sum + (item?.promo_discount ?? 0) + (item?.shop_subside_price ?? 0);
  }, 0);

  const taxaEntrega = pedido.price?.store_charged_delivery_price ?? 0;

  const observacoes = "";
  const aplicarDesconto = valorDesconto > 0 ? 1 : 0;
  const observacaoCupom = montarObservacaoCupom(pedido);
  const taxaServicoPadrao = 0;

  const guid = uuidv4();

  const outrasTaxas =
    pedido.price?.others_fees?.service_price +
      pedido.price?.others_fees?.meal_top_up_price ?? 0;

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
    observacoes,
    valorDesconto: valorDesconto / 100,
    valorTotal:
      (pedido.price.order_price + outrasTaxas + taxaEntrega - valorDesconto) /
      100,
    valorEntrega: taxaEntrega / 100,
    // IDRetornoSatVenda
  });

  const tags = [
    { chave: "Food99-orderId", valor: pedido.order_id },
    { chave: "Food99-shortReference", valor: pedido.order_index },
    { chave: "Food99-Type", valor: pedido.delivery_type },
    { chave: "Food99-status", valor: pedido.status },
    { chave: "Food99-app-shop-id", valor: pedido.shop.app_shop_id },
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

  const DELIVERY_TYPE_MAP = {
    1: "Food99",
    2: "local",
  };

  const tag = await procurarTagGUIDChave({
    chave: "Food99-orderId",
    GUID: pedido.GUIDIdentificacao,
  });

  const { Valor: shopId } = await procurarTagGUIDChave({
    chave: "Food99-app-shop-id",
    GUID: pedido.GUIDIdentificacao,
  });

  const detalhesDoPedido = await api.get("/order/order/detail", {
    shopId,
    params: { order_id: tag.Valor },
  });

  // Se não incluir os status estão dessincronizados
  const statusPedidoDessinconizado = !STATUS_PDV_99FOOD[
    pedido.IDStatusPedido
  ].includes(detalhesDoPedido.data.data.status);

  const statusPedidoNoPdv = STATUS_PDV[pedido.IDStatusPedido];
  const tipoEntrega =
    DELIVERY_TYPE_MAP[detalhesDoPedido.data.data.delivery_type] ||
    "desconecido";

  if (statusPedidoDessinconizado) {
    if (statusPedidoNoPdv === "aberto") {
      console.log("Confirmando pedido - 99Food");

      const response = await api.post("/order/order/confirm", null, {
        shopId,
        params: {
          order_id: tag.Valor,
        },
      });

      if (response.data.errno === 0) {
        await atualizarValorTag({
          GUID: pedido.GUIDIdentificacao,
          chave: "Food99-status",
          valor: 200,
        });
      }

      if (response.data.errno === 12010) {
        console.log("Pedido cancelado no 99Food, atualizando status no PDV7");
        await atualizarValorTag({
          chave: "Food99-status",
          GUID: tag.Valor,
          valor: 922, // cancelado
        });

        await atualizarStatusPedido({
          GUID: pedido.GUIDIdentificacao,
          IDStatusPedido: 50, // "cancelado"
        });
      }

      return;
    }

    if (statusPedidoNoPdv === "enviado") {
      console.log("Pedido pronto - 99Food");

      await api.post("/order/order/ready", null, {
        shopId,
        params: {
          order_id: tag.Valor,
        },
      });

      await atualizarValorTag({
        GUID: pedido.GUIDIdentificacao,
        chave: "Food99-status",
        valor: 400,
      });

      return;
    }

    if (statusPedidoNoPdv === "cancelado") {
      console.log("Cancelando pedido - 99Food");

      const motivosCancelamento99Food = {
        "Item sold out": 1010,
        "Store closed for the day": 1020,
        "Store too busy to prepare order": 1030,
        "Major accident or utility outage": 1040,
        "Canceled due to customer issue": 1050,
        "No courier available": 1060,
        "Menu needs to be updated": 1070,
        "Order is outside the delivery area": 1071,
        "Order address is in an unsafe area": 1072,
        "Suspected fraud or prank": 1073,
        "Questions about fees or promotions": 1074,
        "Other reason": 1080,
      };

      const motivoCancelamento = await procurarMotivoCancelamentoPedido({
        IDPedido: pedido.IDPedido,
      });

      const reasonId =
        motivosCancelamento99Food[motivoCancelamento?.Nome] ?? 1080;

      await api.post("/order/order/cancel", null, {
        shopId,
        params: {
          order_id: tag.Valor,
          reason_id: reasonId,
          reason: "Cancelado pelo PDV",
        },
      });

      await atualizarValorTag({
        GUID: pedido.GUIDIdentificacao,
        chave: "Food99-status",
        valor: 921,
      });

      return;
    }

    if (statusPedidoNoPdv === "finalizado" && tipoEntrega === "local") {
      console.log("Finalizando pedido - 99Food");

      await api.post("/order/order/delivered", null, {
        shopId,
        params: { order_id: tag.Valor },
      });

      await atualizarValorTag({
        GUID: pedido.GUIDIdentificacao,
        chave: "Food99-status",
        valor: 600,
      });

      return;
    }
  }

  return;
};

export const verificarExistenciaPedido = async ({ orderId }) => {
  return await procurarTagChaveValor({
    chave: "Food99-orderId",
    valor: orderId,
  });
};
