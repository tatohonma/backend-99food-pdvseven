import { configuracoes } from "../config/pdv7.js";
import { criarPedidoPagamento } from "../repositories/pedido_pagamento.js";
import { calcularTotais } from "./calculo_pedido.js";

export const adicionarPagamento = async ({ idPedido, pedido }) => {
	const mapTipoPagamento = {
		150: configuracoes.tipoPagamento.credito, // 150 é cartão crédito ou débito
		153: configuracoes.tipoPagamento.dinheiro,
		212: configuracoes.tipoPagamento.pix,
	};

	const { valorTotal } = calcularTotais(pedido);
	const valorDoPagamento = valorTotal;

	const pagamentoRealizadoNa99Food =
		pedido.delivery_type === 1 || pedido.pay_method === 1;

	const idTipoPagamento = pagamentoRealizadoNa99Food
		? configuracoes.tipoPagamento["99Food"]?.IDTipoPagamento
		: mapTipoPagamento[pedido.pay_channel]?.IDTipoPagamento;

	const tipoPagamentoOutros = configuracoes.tipoPagamento.outros;

	if (!idTipoPagamento && !tipoPagamentoOutros) {
		throw new Error(
			"Nenhum tipo de pagamento configurado no PDV7 para o pedido 99Food",
		);
	}

	await criarPedidoPagamento({
		idPedido,
		valorDoPagamento: pagamentoRealizadoNa99Food
			? valorDoPagamento / 100
			: (pedido?.change_for ?? valorDoPagamento) / 100,
		idGateway: null,
		IDTipoPagamento: idTipoPagamento ?? tipoPagamentoOutros?.IDTipoPagamento,
		IDUsuario: configuracoes.usuario.IDUsuario,
	});

	return {
		value: parseFloat(valorDoPagamento),
	};
};
