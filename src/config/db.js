import sql from "mssql";
import { env } from "./env.js";

const config = {
  server: env.PDV7_DB_SERVER,
  authentication: {
    type: "default",
    options: {
      userName: env.PDV7_DB_USER,
      password: env.PDV7_DB_PASS,
    },
  },
  options: {
    encrypt: true,
    trustServerCertificate: true,
    database: env.PDV7_DB_NAME,
  },
  requestTimeout: 60000,
};

class Database {
  constructor() {
    this.pool = null;
  }

  async getPool() {
    if (!this.pool) {
      this.pool = sql.connect(config);
    }
    return this.pool;
  }

  async verifyConnection() {
    try {
      const pool = await this.getPool();
      await pool.request().query("SELECT 1");
      console.log("conexao com o banco de dados bem-sucedida.");
    } catch (err) {
      throw new Error(`erro ao conectar no SQLServer: ${err.message}`);
    }
  }
}

export const db = new Database();
