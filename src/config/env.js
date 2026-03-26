import "dotenv/config";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

const envSchema = z.object({
  NODE_ENV: z.enum(["dev", "test", "production"]).default("dev"),
  PORT: z.coerce.number().default(5103),
  PDV7_DB_SERVER: z.string(),
  PDV7_DB_USER: z.string(),
  PDV7_DB_PASS: z.string(),
  PDV7_DB_NAME: z.string(),
  CAIXA_PDV: z.coerce.number().default(1),
  CHAVE_ACESSO: z.string().default("9933"),
  APP_SECRET: z.string(),
  APP_ID: z.string(),
  SHOP_ID: z.string().default("3"),
  WEB_HOOK_SECRET: z.string(),
});

const _env = envSchema.safeParse(process.env);

if (_env.success === false) {
  console.error(
    "❌ variáveis ambiente inválidas",
    fromZodError(_env.error).details,
  );
  throw new Error("variáveis ambiente inválidas");
}

export const env = _env.data;
