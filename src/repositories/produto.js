import { db } from "../config/db.js";
import sql from "mssql";

export const obterProdutoTaxaDeServico99Food = async () => {
  const pool = await db.getPool();

  const produtoResult = await pool.request().query(`
    SELECT *
    FROM tbProduto
    WHERE Nome = 'Taxa de Serviço 99Food'
  `);

  return produtoResult.recordset[0];
};
