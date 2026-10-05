import { listarPedidos } from "../repositories/pedido.js";
import { sincronisarStatus } from "../services/pedido.js";
import { logErro } from "../utils/log_erro.js";

let sincronizando = false;

// Erro sem resposta da 99Food (API fora do ar/inacessível): não adianta
// insistir nos demais pedidos desta rodada
const apiIndisponivel = (error) => error?.isAxiosError && !error.response;

const executarSincronizacao = async () => {
  const pedidos = await listarPedidos();

  console.log("Pedidos encontrados: ", pedidos.length);

  for (const pedido of pedidos ?? []) {
    try {
      await sincronisarStatus({ pedido });
    } catch (error) {
      logErro(`Erro ao sincronizar pedido ${pedido.IDPedido}`, error);

      if (apiIndisponivel(error)) {
        console.warn("99Food indisponível, sincronização interrompida.");
        break;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
};

export const syncController = async (req, res) => {
  if (sincronizando) {
    console.log("Sincronização já em andamento, ignorando nova chamada.");
    return res.status(202).send({ message: "pedidos sendo sincronizados" });
  }

  sincronizando = true;
  console.log("Sincronizando pedidos");

  // Responde de imediato ao cron e processa em segundo plano
  res.status(202).send({ message: "pedidos sendo sincronizados" });

  try {
    await executarSincronizacao();
  } catch (error) {
    logErro("Erro na sincronização de pedidos", error);
  } finally {
    sincronizando = false;
  }
};
