import { listarPedidos } from "../repositories/pedido.js";
import { sincronisarStatus } from "../services/pedido.js";

export const syncController = async (req, res) => {
  console.log("Sincronizando pedidods");
  const pedidos = await listarPedidos();

  if (pedidos) {
    for (const pedido of pedidos) {
      sincronisarStatus({
        pedido,
      });
    }
  }

  res.send({ message: "pedidos sendo sincronizados" });
};
