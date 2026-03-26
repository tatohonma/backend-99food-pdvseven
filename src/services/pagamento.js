import { configuracoes } from "../config/pdv7.js";
import { criarPedidoPagamento } from "../repositories/pedido_pagamento.js";

export const adicionarPagamento = async ({ idPedido, pedido }) => {
  const mapTipoPagamento = {
    150: configuracoes.tipoPagamento.credito, // 150 é cartão crédito ou débito
    153: configuracoes.tipoPagamento.dinheiro,
    212: configuracoes.tipoPagamento.pix,
  };

  const valorDoPagamento =
    pedido.order_info.pay_channel === 150
      ? pedido.order_info.change_for ||
        pedido.order_info.price.real_pay_price ||
        pedido.order_info.price.order_price
      : pedido.order_info.price.real_pay_price ||
        pedido.order_info.price.order_price;

  await criarPedidoPagamento({
    idPedido,
    valorDoPagamento: valorDoPagamento / 100,
    idGateway: null,
    IDTipoPagamento:
      mapTipoPagamento[pedido.order_info.pay_channel]?.IDTipoPagamento ??
      configuracoes.tipoPagamento.outros.IDTipoPagamento,
    IDUsuario: configuracoes.usuario.IDUsuario,
  });

  return {
    value: parseFloat(valorDoPagamento),
  };
};
