import { db } from "../config/db.js";

export const buscarIdEstado = async ({ estado }) => {
  const pool = await db.getPool();

  if (!estado || estado.trim() === "") {
    return 25;
  }

  const result = await pool
    .request()
    .input("Sigla", estado)
    .query(`SELECT IDEstado FROM tbEstado WHERE Sigla = @Sigla`);

  if (result.recordset.length === 0 || !result.recordset[0].IDEstado) {
    return 25;
  }

  return result.recordset[0].IDEstado;
};
