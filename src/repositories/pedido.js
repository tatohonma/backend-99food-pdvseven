import { db } from "../config/db.js";
import sql from "mssql";
import { v4 as uuidv4 } from "uuid";

export const criarPedido = async ({
  idCliente,
  idTipoDesconto,
  idTaxaEntrega,
  guid,
  valorDesconto,
  valorTotal,
  valorEntrega,
  aplicarDesconto,
  observacaoCupom,
  idOrigemPedido,
  taxaServicoPadrao,
  idEntregador,
  IDRetornoSatVenda = null,
  observacoes,
}) => {
  const pool = await db.getPool();

  const result = await pool
    .request()
    .input("IDCliente", sql.Int, idCliente)
    .input("IDTipoPedido", sql.Int, 30)
    .input("IDStatusPedido", sql.Int, 60)
    .input("IDTipoDesconto", sql.Int, valorDesconto > 0 ? idTipoDesconto : null)
    .input("IDTaxaEntrega", sql.Int, idTaxaEntrega)
    .input("GUIDIdentificacao", sql.NVarChar(50), guid)
    .input("GUIDMovimentacao", sql.NVarChar(50), uuidv4())
    .input("ValorDesconto", sql.Decimal(18, 2), valorDesconto)
    .input("ValorTotal", sql.Decimal(18, 2), valorTotal)
    .input("Observacoes", sql.NVarChar(sql.MAX), observacoes)
    .input("ValorEntrega", sql.Decimal(18, 2), valorEntrega)
    .input("AplicarDesconto", sql.Bit, aplicarDesconto)
    .input("ObservacaoCupom", sql.NVarChar(sql.MAX), observacaoCupom)
    .input("IDOrigemPedido", sql.Int, idOrigemPedido)
    .input("PermitirAlterar", sql.Bit, 0)
    .input("TaxaServicoPadrao", sql.Int, taxaServicoPadrao)
    .input("IDEntregador", sql.Int, idEntregador)
    .input("IDRetornoSAT_Venda", sql.Int, IDRetornoSatVenda).query(`
          INSERT INTO [dbo].[tbPedido]
              ([IDCliente], [IDTipoPedido], [IDStatusPedido], [IDTipoDesconto], [IDTaxaEntrega], [GUIDIdentificacao], [GUIDMovimentacao], [DtPedido], [ValorDesconto], [ValorTotal], [Observacoes], [ValorEntrega], [AplicarDesconto], [ObservacaoCupom], [IDOrigemPedido], [PermitirAlterar], [IDEntregador], [TaxaServicoPadrao], [IDRetornoSAT_Venda])
          OUTPUT INSERTED.IDPedido
          VALUES
              (@IDCliente, @IDTipoPedido, @IDStatusPedido, @IDTipoDesconto, @IDTaxaEntrega, @GUIDIdentificacao, @GUIDMovimentacao, GetDate(), @ValorDesconto, @ValorTotal, @Observacoes, @ValorEntrega, @AplicarDesconto, @ObservacaoCupom, @IDOrigemPedido, @PermitirAlterar, @IDEntregador, @TaxaServicoPadrao, @IDRetornoSAT_Venda)
      `);

  return result.recordset[0].IDPedido;
};

export const atualizarStatusPedido = async ({ GUID, IDStatusPedido }) => {
  const pool = await db.getPool();

  const result = await pool
    .request()
    .input("GUIDIdentificacao", sql.NVarChar(50), GUID)
    .input("IDStatusPedido", sql.Int, IDStatusPedido).query(`
        UPDATE [dbo].[tbPedido]
        SET IDStatusPedido = @IDStatusPedido
        WHERE GUIDIdentificacao = @GUIDIdentificacao;
      `);

  return result.rowsAffected;
};

export const adcionarObservacoes = async ({ IDPedido, observacoes }) => {
  const pool = await db.getPool();
  await pool
    .request()
    .input("IDPedido", sql.Int, IDPedido)
    .input("Observacoes", sql.NVarChar(sql.MAX), observacoes)
    .query(
      `UPDATE tbPedido SET Observacoes = @Observacoes WHERE IDPedido = @IDPedido`,
    );
};

export const listarPedidos = async () => {
  const pool = await db.getPool();
  // origem 99Food = 6
  const pedidos = await pool.request().query(`
    SELECT *
    FROM [dbo].[tbPedido]
    WHERE IDTipoPedido = 30
      AND IDOrigemPedido = 6
      AND DtPedido >= DATEADD(HOUR, -6, GETDATE());
  `);

  return pedidos.recordset;
};
