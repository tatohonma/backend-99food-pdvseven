import { listarPedidos } from "../repositories/pedido.js";
import { sincronisarStatus } from "../services/pedido.js";

export const syncController = async (req, res) => {
  console.log("Sincronizando pedidods");
  const pedidos = await listarPedidos();

  console.log("Pedidos encontrados: ", pedidos.length);

  if (pedidos) {
    for (const pedido of pedidos) {
      await sincronisarStatus({
        pedido,
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  res.send({ message: "pedidos sendo sincronizados" });
};
