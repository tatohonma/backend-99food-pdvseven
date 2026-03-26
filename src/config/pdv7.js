import { SetupRepository } from "../repositories/setup.js";

export const configuracoes = {
  usuario: null,
  pdv: null,
  tipoDesconto: null,
  tipoEntrega: null,
  entregador: null,
  origemPedido: null,
  tipoPagamento: {
    dinheiro: null,
    credito: null,
    debito: null,
    vr: null,
    pix: null,
    keeta: null,
    outros: null,
  },
};

export const setup = async () => {
  console.log("iniciando configurações...");

  configuracoes.origemPedido = await SetupRepository.obterOrigemPedido();
  console.log("  - OrigemPedido carregada");

  configuracoes.pdv = await SetupRepository.obterIPDV();
  console.log("  - PDV carregado:", configuracoes.pdv.Nome);

  configuracoes.usuario = await SetupRepository.obterUsuario();
  console.log("  - Usuario carregado:", configuracoes.usuario.Nome);

  configuracoes.tipoDesconto = await SetupRepository.obterTipoDesconto();
  console.log(
    "  - Tipo de desconto carregado:",
    configuracoes.tipoDesconto.Nome,
  );

  configuracoes.entregador = await SetupRepository.obterEntregador();
  console.log("  - Entregador carregado");

  configuracoes.taxaEntrega = await SetupRepository.obterTaxaEntrega();
  console.log("  - TaxaEntrega carregada");

  configuracoes.tipoPagamento.keeta =
    await SetupRepository.obterTipoPagamento99Food();
  console.log("  - TipoPagamento keeta carregado");

  configuracoes.tipoPagamento.dinheiro =
    await SetupRepository.obterTipoPagamentoPorSAT(1);
  console.log("  - TipoPagamento Dinheiro carregado");

  configuracoes.tipoPagamento.credito =
    await SetupRepository.obterTipoPagamentoPorSAT(3);
  console.log("  - TipoPagamento Crédito carregado");

  configuracoes.tipoPagamento.debito =
    await SetupRepository.obterTipoPagamentoPorSAT(4);
  console.log("  - TipoPagamento Débito carregado");

  configuracoes.tipoPagamento.vr = await SetupRepository.obterVR();
  console.log("  - TipoPagamento VR carregado");

  configuracoes.tipoPagamento.pix = await SetupRepository.obterPix();
  console.log("  - TipoPagamento PIX carregado");

  configuracoes.tipoPagamento.outros =
    await SetupRepository.obterTipoPagamentoPorSAT(10);
  console.log("  - TipoPagamento Outros carregado");

  console.log("configurações carregadas com sucesso");
};
