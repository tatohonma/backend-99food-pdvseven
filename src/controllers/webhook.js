import { adicionarCliente } from "../services/cliente.js";
import {
  adicionarPedido,
  verificarExistenciaPedido,
} from "../services/pedido.js";
import {
  adicionarPedidoProduto,
  adicionarProdutos,
} from "../services/produto.js";
import { adicionarPagamento } from "../services/pagamento.js";
import {
  adcionarObservacoes,
  atualizarStatusPedido,
} from "../repositories/pedido.js";
import { formatarTicket } from "../services/ticket.js";
import {
  atualizarValorTag,
  procurarTagChaveValor,
} from "../repositories/tag.js";
import { env } from "../config/env.js";
import { api } from "../config/axios.js";
import { obterProdutoTaxaDeServico99Food } from "../repositories/produto.js";
import { procurarCaixaAberto } from "../repositories/caixa.js";

export const webhookController = async (req, res) => {
  const token = req.query.token;

  if (token !== env.WEB_HOOK_SECRET)
    return res.status(401).send("Unauthorized");

  if (req.body.type === "orderNew") {
    try {
      const response = await api.get("/order/order/detail", {
        params: { order_id: req.body.data.order_id },
      });

      console.log(`Recebendo pedido ${req.body.data.order_id} do 99Food\n`);
      console.log(`Response: ${JSON.stringify(response.data)}\n`);

      const pedido = response.data.data;
      const pedidoExistente = await verificarExistenciaPedido({
        orderId: pedido.order_id,
      });

      if (pedidoExistente) {
        console.log(`Pedido ${pedido.order_id} já registrado.`);
        return res.send({ errno: 0, errmsg: "ok" });
      }

      console.log(
        `Adicionar pedido ${pedido.order_id}\n, order_id: ${req.body.data.order_id}`,
      );

      const clientId = await adicionarCliente({ pedido });
      const insertedId = await adicionarPedido(pedido, clientId);

      await adicionarProdutos({
        idPedido: insertedId,
        produtos: pedido.order_items,
      });

      if (pedido?.price?.others_fees?.service_price > 0) {
        const produto = await obterProdutoTaxaDeServico99Food();

        const item = {
          sku_price: pedido.price.others_fees.service_price,
          amount: 1,
        };

        await adicionarPedidoProduto(
          insertedId,
          {
            idProduto: produto.IDProduto,
            observacao: "",
          },
          null,
          item,
        );
      }

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
      return res.status(500).send({
        errno: 1,
        errmsg: "erro ao inserir pedido",
        error: error.message,
      });
    }
  }

  if (req.body.type === "orderCancel") {
    try {
      console.log(
        `status pvd7 sendo alterado para cancelado, id: ${req.body.data.order_id}`,
      );

      const tag = await procurarTagChaveValor({
        chave: "Food99-orderId",
        valor: req.body.data.order_id,
      });

      if (tag) {
        await atualizarValorTag({
          chave: "Food99-status",
          GUID: tag.GUIDIdentificacao,
          valor: 922, // cancelado
        });

        await atualizarStatusPedido({
          GUID: tag.GUIDIdentificacao,
          IDStatusPedido: 50, // "cancelado"
        });
      }
    } catch (error) {
      console.error("erro ao cancelar pedido:", error);
      return res.status(500).send({
        errno: 1,
        errmsg: "erro ao cancelar pedido",
        error: error.message,
      });
    }
  }

  if (req.body.type === "orderFinish") {
    try {
      console.log(
        `status pvd7 sendo alterado para finalizado, id: ${req.body.data.order_id}`,
      );

      const tag = await procurarTagChaveValor({
        chave: "Food99-orderId",
        valor: req.body.data.order_id,
      });

      if (tag) {
        await atualizarValorTag({
          chave: "Food99-status",
          GUID: tag.GUIDIdentificacao,
          valor: 600, // finalizado
        });

        const idCaixaAberto = await procurarCaixaAberto({
          idPDV: env.CAIXA_PDV,
        });

        await atualizarStatusPedido({
          GUID: tag.GUIDIdentificacao,
          IDStatusPedido: 40, // "finalizado"
          dtPedidoFechamento: new Date(),
          idCaixa: idCaixaAberto.IDCaixa,
        });
      }
    } catch (error) {
      console.error("erro ao finalizar pedido:", error);
      return res.status(500).send({
        errno: 1,
        errmsg: "erro ao finalizar pedido",
        error: error.message,
      });
    }
  }

  res.send({ errno: 0, errmsg: "ok" });
};
