import { db } from "../config/db.js";

export const procurarTagChaveValor = async ({ chave, valor }) => {
  const pool = await db.getPool();

  const tag = await pool.request().input("Valor", valor).input("Chave", chave)
    .query(`
      SELECT *
      FROM [dbo].[tbTag]
      WHERE Valor = @Valor
      AND Chave = @Chave;
    `);

  return tag.recordset[0];
};

export const procurarTagGUIDChave = async ({ chave, GUID }) => {
  const pool = await db.getPool();

  const tag = await pool
    .request()
    .input("GUIDIdentificacao", GUID)
    .input("Chave", chave).query(`
      SELECT *
      FROM [dbo].[tbTag]
      WHERE GUIDIdentificacao = @GUIDIdentificacao
        AND Chave = @Chave;
    `);

  return tag.recordset[0];
};

export const atualizarValorTag = async ({ GUID, valor, chave }) => {
  const pool = await db.getPool();

  const tag = await pool
    .request()
    .input("GUIDIdentificacao", GUID)
    .input("Chave", chave)
    .input("Valor", valor).query(`
    UPDATE [dbo].[tbTag]
    SET Valor = @Valor
    WHERE GUIDIdentificacao = @GUIDIdentificacao
      AND Chave = @Chave;
  `);

  return tag;
};

export const criarTag = async ({ GUID, chave, valor }) => {
  const pool = await db.getPool();
  const DtInclusao = new Date();

  const tag = await pool
    .request()
    .input("GUIDIdentificacao", GUID)
    .input("Chave", chave)
    .input("Valor", valor)
    .input("DtInclusao", DtInclusao).query(`
      INSERT INTO tbTag (GUIDIdentificacao, Chave, Valor, DtInclusao)
      VALUES (@GUIDIdentificacao, @Chave, @Valor, @DtInclusao)
  `);

  return tag;
};
