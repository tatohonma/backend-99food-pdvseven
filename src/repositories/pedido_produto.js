import { db } from "../config/db.js";
import sql from "mssql";

export const criarPedidoProduto = async ({
  idPDV,
  idPedido,
  idProduto,
  idUsuario,
  quantity,
  price,
  notas,
  idPedidoProdutoPai,
}) => {
  const pool = await db.getPool();

  const result = await pool
    .request()
    .input("IDPedido", sql.Int, idPedido)
    .input("IDProduto", sql.Int, idProduto)
    .input("IDPedidoProduto_pai", sql.Int, idPedidoProdutoPai)
    .input("IDPDV", sql.Int, idPDV)
    .input("IDUsuario", sql.Int, idUsuario)
    .input("Quantidade", sql.Decimal(18, 3), quantity)
    .input("ValorUnitario", sql.Decimal(18, 2), price)
    .input("Notas", sql.NVarChar(sql.MAX), notas)
    .input("Cancelado", sql.Bit, 0)
    .input("RetornarAoEstoque", sql.Bit, 0).query(`
      INSERT INTO tbPedidoProduto
        (IDPedido, IDProduto, IDPedidoProduto_pai, IDPDV, IDUsuario, Quantidade, ValorUnitario, Notas, DtInclusao, Cancelado, RetornarAoEstoque)
      OUTPUT INSERTED.IDPedidoProduto
      VALUES
        (@IDPedido, @IDProduto, @IDPedidoProduto_pai, @IDPDV, @IDUsuario, @Quantidade, @ValorUnitario, @Notas, GETDATE(), @Cancelado, @RetornarAoEstoque)
    `);

  return result.recordset[0].IDPedidoProduto;
};
