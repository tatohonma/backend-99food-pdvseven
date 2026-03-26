import { adicionarCliente } from "../services/cliente.js";
import { adicionarPedido } from "../services/pedido.js";
import { adicionarProdutos } from "../services/produto.js";
import { adicionarPagamento } from "../services/pagamento.js";
import {
  adcionarObservacoes,
  atualizarStatusPedido,
} from "../repositories/pedido.js";
import { formatarTicket } from "../services/ticket.js";
import { atualizarValorTag } from "../repositories/tag.js";

export const webhookController = async (req, res) => {
  if (req.body.type === "orderNew") {
    try {
      const pedido = req.body.data;

      console.log(`Adicionar pedido ${pedido.order_id}\n`);
      const clientId = await adicionarCliente({ pedido });
      const insertedId = await adicionarPedido(pedido, clientId);

      await adicionarProdutos({
        idPedido: insertedId,
        produtos: pedido.order_info.order_items,
      });

      const pagamento = await adicionarPagamento({
        idPedido: insertedId,
        pedido,
      });

      const ticket = formatarTicket({ pedido, pagamento });
      await adcionarObservacoes({ IDPedido: insertedId, observacoes: ticket });

      console.log("------------------------------------------");
      console.log(ticket);
      console.log("------------------------------------------");
    } catch (error) {
      console.error("erro ao inserir pedido:", error);
    }
  }

  if (req.body.type === "orderCancel") {
    try {
      console.log(
        `status pvd7 sendo alterado para cancelado, id: ${req.body.data.order_id}`,
      );

      await atualizarValorTag({
        chave: "99Food-status",
        GUID: req.body.data.order_id,
        valor: 922, // cancelado
      });

      await atualizarStatusPedido({
        GUID: req.body.data.order_id,
        IDStatusPedido: 50, // "cancelado"
      });
    } catch (error) {
      console.error("erro ao cancelar pedido:", error);
    }
  }

  if (req.body.type === "orderFinish") {
    try {
      console.log(
        `status pvd7 sendo alterado para finalizado, id: ${req.body.data.order_id}`,
      );

      await atualizarValorTag({
        chave: "99Food-status",
        GUID: req.body.data.order_id,
        valor: 600, // cancelado
      });

      await atualizarStatusPedido({
        GUID: req.body.data.order_id,
        IDStatusPedido: 40, // "cancelado"
      });
    } catch (error) {
      console.error("erro ao cancelar pedido:", error);
    }
  }

  res.send({ errno: 0, errmsg: "ok" });
};
