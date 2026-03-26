import { db } from "../config/db.js";
import { env } from "../config/env.js";

const obterOrigemPedido = async () => {
  const pool = await db.getPool();

  const origem = await pool
    .request()
    .query(`SELECT * FROM tbOrigemPedido WHERE nome='99Food'`);

  if (origem.recordset.length === 0) {
    const result = await pool
      .request()
      .query(
        `INSERT INTO tbOrigemPedido (nome) OUTPUT INSERTED.* VALUES ('99Food')`,
      );

    return result.recordset[0];
  }

  return origem.recordset[0];
};

const obterIPDV = async () => {
  const pool = await db.getPool();

  const ipdv = await pool
    .request()
    .input("ipdv", env.CAIXA_PDV)
    .query(`SELECT * FROM tbPDV WHERE idPDV=@ipdv`);

  if (ipdv.recordset.length === 0) throw "erro ao carregar ipdv";
  return ipdv.recordset[0];
};

const obterUsuario = async () => {
  const pool = await db.getPool();

  const user = await pool
    .request()
    .input("pass", env.CHAVE_ACESSO)
    .query(`SELECT * FROM tbUsuario WHERE senha=@pass`);

  if (user.recordset.length === 0) throw "erro ao carregar usuario";
  return user.recordset[0];
};

const obterTipoDesconto = async () => {
  const pool = await db.getPool();

  const tipoDesconto = await pool
    .request()
    .query(`SELECT * FROM tbTipoDesconto WHERE nome='99Food'`);

  if (tipoDesconto.recordset.length === 0) {
    const result = await pool
      .request()
      .query(
        `INSERT INTO tbTipoDesconto (nome, ativo, excluido) OUTPUT INSERTED.* VALUES ('99Food', 1, 0)`,
      );

    return result.recordset[0];
  }

  return tipoDesconto.recordset[0];
};

const obterEntregador = async () => {
  const pool = await db.getPool();

  const entregador = await pool
    .request()
    .input("nome", "99Food")
    .query(`SELECT * FROM tbEntregador WHERE nome=@nome`);

  if (entregador.recordset.length === 0) {
    const result = await pool.request().query(
      `INSERT INTO tbEntregador (nome, ativo, excluido)
         OUTPUT INSERTED.*
         VALUES ('99Food', 1, 0)`,
    );

    return result.recordset[0];
  }

  return entregador.recordset[0];
};

const obterTaxaEntrega = async () => {
  const pool = await db.getPool();

  const taxa = await pool
    .request()
    .input("nome", "99Food")
    .query(`SELECT * FROM tbTaxaEntrega WHERE nome=@nome`);

  if (taxa.recordset.length === 0) {
    const result = await pool.request().query(
      `INSERT INTO tbTaxaEntrega (nome, valor, ativo, excluido)
         OUTPUT INSERTED.*
         VALUES ('99Food', 0, 1, 0)`,
    );

    return result.recordset[0];
  }

  return taxa.recordset[0];
};

const obterTipoPagamento99Food = async () => {
  const pool = await db.getPool();

  const tipo = await pool
    .request()
    .input("nome", "99Food")
    .query(`SELECT * FROM tbTipoPagamento WHERE nome=@nome`);

  if (tipo.recordset.length === 0) {
    await pool.request().query(`
      INSERT INTO tbGateway (idGateway, nome)
      VALUES (8, '99Food')
    `);

    const result = await pool.request().query(`
      INSERT INTO tbTipoPagamento
      (nome, registrarValores, ativo, idMeioPagamentoSAT, idGateway)
      OUTPUT INSERTED.*
      VALUES ('99Food', 0, 1, 10, 8)
    `);

    return result.recordset[0];
  }

  return tipo.recordset[0];
};

const obterTipoPagamentoPorSAT = async (id) => {
  const pool = await db.getPool();

  const result = await pool
    .request()
    .input("id", id)
    .query(`SELECT * FROM tbTipoPagamento WHERE idMeioPagamentoSAT=@id`);

  if (result.recordset.length === 0) {
    throw new Error(`TipoPagamento SAT ${id} não encontrado`);
  }

  return result.recordset[0];
};

const obterVR = async () => {
  const pool = await db.getPool();

  let vr = await pool
    .request()
    .query(`SELECT * FROM tbTipoPagamento WHERE idMeioPagamentoSAT=7`);

  if (vr.recordset.length === 0) {
    await pool.request().query(`
      INSERT INTO tbTipoPagamento
      (nome, CodigoImpressoraFiscal, registrarValores, ativo, idMeioPagamentoSAT)
      VALUES ('Vale Refeição', 0, 1, 1, 7)
    `);

    vr = await pool
      .request()
      .query(`SELECT * FROM tbTipoPagamento WHERE idMeioPagamentoSAT=7`);
  }

  return vr.recordset[0];
};

const obterPix = async () => {
  const pool = await db.getPool();

  let pix = await pool
    .request()
    .input("nome", "Pix")
    .query(`SELECT * FROM tbTipoPagamento WHERE nome=@nome`);

  if (pix.recordset.length === 0) {
    await pool.request().query(`
      INSERT INTO tbTipoPagamento
      (nome, CodigoImpressoraFiscal, registrarValores, ativo, idMeioPagamentoSAT)
      VALUES ('Pix', 0, 1, 1, 10)
    `);

    pix = await pool
      .request()
      .input("nome", "Pix")
      .query(`SELECT * FROM tbTipoPagamento WHERE nome=@nome`);
  }

  return pix.recordset[0];
};

const obterIdPdv = async () => {
  const pool = await db.getPool();

  const result = await pool.request().query(`
    SELECT TOP 1 Valor FROM tbConfiguracaoBD
    WHERE IDTipoPDV = 290 AND Chave = 'IDPDV' AND Titulo = 'IDPDV do Caixa para Contabilizar o 99Food'
  `);

  if (result.recordset.length === 0) {
    throw new Error("Nenhum IDPDV encontrado na tabela tbConfiguracaoBD.");
  }

  return result.recordset[0];
};

export const SetupRepository = {
  obterTipoPagamentoPorSAT,
  obterTipoPagamento99Food,
  obterOrigemPedido,
  obterTipoDesconto,
  obterTaxaEntrega,
  obterEntregador,
  obterUsuario,
  obterIPDV,
  obterVR,
  obterPix,
  obterIdPdv,
};
