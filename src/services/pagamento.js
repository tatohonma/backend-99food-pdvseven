import { configuracoes } from "../config/pdv7.js";
import { criarPedidoPagamento } from "../repositories/pedido_pagamento.js";

export const adicionarPagamento = async ({ idPedido, pedido }) => {
  const mapTipoPagamento = {
    150: configuracoes.tipoPagamento.credito, // 150 é cartão crédito ou débito
    153: configuracoes.tipoPagamento.dinheiro,
    212: configuracoes.tipoPagamento.pix,
  };

  const outrasTaxas =
    pedido.price?.others_fees?.service_price +
      pedido.price?.others_fees?.meal_top_up_price ?? 0;
  const valorDesconto =
    pedido.price.items_discount + pedido.price.delivery_discount;
  const taxaEntrega = pedido.price?.store_charged_delivery_price ?? 0;

  const valorDoPagamento =
    pedido.pay_channel === 150
      ? pedido.price.real_pay_price ||
        pedido.price.order_price + outrasTaxas - valorDesconto
      : pedido.change_for ||
        pedido.price.real_pay_price ||
        pedido.price.order_price + outrasTaxas - valorDesconto;

  const idTipoPagamento =
    pedido.delivery_type === 1
      ? configuracoes.tipoPagamento["99Food"].IDTipoPagamento
      : mapTipoPagamento[pedido.pay_channel]?.IDTipoPagamento;

  await criarPedidoPagamento({
    idPedido,
    valorDoPagamento: valorDoPagamento / 100,
    idGateway: null,
    IDTipoPagamento:
      idTipoPagamento ?? configuracoes.tipoPagamento.outros.IDTipoPagamento,
    IDUsuario: configuracoes.usuario.IDUsuario,
  });

  return {
    value: parseFloat(valorDoPagamento),
  };
};
