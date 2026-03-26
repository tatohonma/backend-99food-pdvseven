import { db } from "../config/db.js";
import sql from "mssql";

export const criarPedidoPagamento = async ({
  idPedido,
  IDTipoPagamento,
  IDUsuario,
  valorDoPagamento,
  idGateway,
}) => {
  const pool = await db.getPool();
  await pool
    .request()
    .input("IDPedido", sql.Int, idPedido)
    .input("IDTipoPagamento", sql.Int, IDTipoPagamento)
    .input("IDUsuarioPagamento", sql.Int, IDUsuario)
    .input("Valor", sql.Decimal(18, 2), valorDoPagamento)
    .input("Excluido", sql.Bit, 0)
    .input("IDGateway", idGateway)
    .input("DataPagamento", sql.DateTime, new Date()).query(`
      INSERT INTO tbPedidoPagamento
        (IDPedido, IDTipoPagamento, IDUsuarioPagamento, Valor, Excluido, IDGateway, DataPagamento)
      VALUES
        (@IDPedido, @IDTipoPagamento, @IDUsuarioPagamento, @Valor, @Excluido, @IDGateway, @DataPagamento)
    `);
};
