import { criarPedidoProduto } from "../repositories/pedido_produto.js";
import { SetupRepository } from "../repositories/setup.js";

export const adicionarProdutos = async ({
  produtos,
  idPedido,
  idPedidoProdutoPai = null,
}) => {
  for (const item of produtos) {
    const produto = {};

    if (item.app_external_id) {
      produto.idPedido = item.app_external_id;
    }

    if (!item.app_external_id) {
      produto.idProduto = 1;
      produto.observacao = `não cadastrado: ${item.name}`;
    }

    const idPedidoProduto = await adicionarPedidoProduto(
      idPedido,
      produto,
      idPedidoProdutoPai,
      item,
    );

    if (item.sub_item_list?.length) {
      adicionarProdutos({
        produtos: item.sub_item_list,
        idPedido,
        idPedidoProdutoPai: idPedidoProduto,
      });
    }
  }
};

const adicionarPedidoProduto = async (
  idPedido,
  produto,
  idPedidoProdutoPai,
  item,
) => {
  const idPDV = await SetupRepository.obterIdPdv();

  const idUsuario = 1;
  const notas = [produto.observacao].filter(Boolean).join(" ");

  const pedidoProduto = criarPedidoProduto({
    idPDV: idPDV.Valor,
    notas,
    idUsuario,
    idPedidoProdutoPai,
    idPedido,
    idProduto: produto.idProduto,
    price: item.total_price / 100,
    quantity: item.amount,
  });

  return pedidoProduto;
};
