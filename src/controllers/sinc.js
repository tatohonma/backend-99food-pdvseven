import { listarPedidos } from "../repositories/pedido.js";
import { sincronisarStatus } from "../services/pedido.js";
import { logErro } from "../utils/log_erro.js";
import { env } from "../config/env.js";

let sincronizando = false;

// IDPedido -> { status, verificadoEm }: último status do PDV em que o pedido
// ficou em dia com a 99Food. Evita consultar a 99Food a cada rodada.
const pedidosEmDia = new Map();
const ESPERA_ENTRE_PEDIDOS_MS = 300;

const precisaSincronizar = (pedido) => {
  const registro = pedidosEmDia.get(pedido.IDPedido);
  if (!registro) return true;

  return (
    registro.status !== pedido.IDStatusPedido ||
    Date.now() - registro.verificadoEm >= env.INTERVALO_RECONFERENCIA_MS
  );
};

// Erro sem resposta da 99Food (API fora do ar/inacessível): não adianta
// insistir nos demais pedidos desta rodada
const apiIndisponivel = (error) => error?.isAxiosError && !error.response;

const executarSincronizacao = async () => {
  const pedidos = (await listarPedidos()) ?? [];

  // Descarta do Map os pedidos que saíram da janela de listagem
  const idsAtuais = new Set(pedidos.map((p) => p.IDPedido));
  for (const id of pedidosEmDia.keys()) {
    if (!idsAtuais.has(id)) pedidosEmDia.delete(id);
  }

  const pendentes = pedidos.filter(precisaSincronizar);

  console.log(
    `Pedidos encontrados: ${pedidos.length}, a sincronizar: ${pendentes.length}`,
  );

  for (const pedido of pendentes) {
    try {
      const emDia = await sincronisarStatus({ pedido });

      if (emDia) {
        pedidosEmDia.set(pedido.IDPedido, {
          status: pedido.IDStatusPedido,
          verificadoEm: Date.now(),
        });
      } else {
        pedidosEmDia.delete(pedido.IDPedido);
      }
    } catch (error) {
      pedidosEmDia.delete(pedido.IDPedido);
      logErro(`Erro ao sincronizar pedido ${pedido.IDPedido}`, error);

      if (apiIndisponivel(error)) {
        console.warn("99Food indisponível, sincronização interrompida.");
        break;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, ESPERA_ENTRE_PEDIDOS_MS));
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
