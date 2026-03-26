import express from "express";
import { router } from "./routes.js";
import { env } from "./config/env.js";
import { setup } from "./config/pdv7.js";
import { db } from "./config/db.js";
import JSONbig from "json-bigint";

const app = express();
app.use(express.text({ type: "application/json" }));
app.use((req, _, next) => {
  if (typeof req.body === "string") {
    try {
      req.body = JSONbig.parse(req.body);
    } catch (e) {
      return next(e);
    }
  }

  next();
});

app.use("/api", router);

app.listen(env.PORT, async () => {
  try {
    console.log("iniciando serviço...");
    await db.verifyConnection();
    await setup();
    console.log(`integração PDV7 e 99Food disponível na porta: ${env.PORT}`);
  } catch (error) {
    console.error("erro ao iniciar serviço:", error);
  }
});
