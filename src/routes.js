import { Router } from "express";
import { webhookController } from "./controllers/webhook.js";
import { syncController } from "./controllers/sinc.js";

export const router = Router();

router.post("/importar", syncController);
router.post("/webhook", webhookController);
