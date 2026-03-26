import { buscarIdEstado } from "../repositories/estado.js";
import { v4 as uuidv4 } from "uuid";
import { procurarTagChaveValor, criarTag } from "../repositories/tag.js";
import {
  atualizarCliente,
  buscarClientePorGUID,
  criarNovoCliente,
} from "../repositories/client.js";

export const adicionarCliente = async ({ pedido }) => {
  const clienteExistenteTag = await procurarTagChaveValor({
    chave: "99Food-customerId",
    valor: pedido.order_info.receive_address.uid,
  });

  let bairro,
    rua,
    cep,
    numero,
    cidade,
    complemento,
    enderecoDeReferenia,
    idEstado;

  const ddd = pedido.order_info.receive_address.phone.substring(0, 2);
  const telefone = pedido.order_info.receive_address.phone.substring(2);
  const documento = pedido.order_info.receive_address.uid;
  const nomeCompleto = pedido.order_info.receive_address.first_name;

  if (pedido.delivery_type === 1) {
    bairro = "RETIRADA";
    cep = "0";
    cidade = "RETIRADA";
    complemento = "";
    enderecoDeReferenia = "";
    rua = "RETIRADA NO LOCAL";
    numero = "S/N";
    idEstado = 25;
  }

  if (pedido.delivery_type === 2) {
    const endereco = pedido.order_info.receive_address;

    enderecoDeReferenia = endereco.reference;
    bairro = endereco.district;
    cep = endereco.postal_code ? endereco.postal_code?.replace(/\D/g, "") : "0";
    cidade = endereco.city;
    complemento = endereco.complement;
    rua = endereco.street_name;
    numero = endereco.street_number;
    idEstado = await buscarIdEstado({ estado: endereco.state });
  }

  if (!clienteExistenteTag) {
    const guid = uuidv4();

    const cliente = await criarNovoCliente({
      bairro,
      cep,
      cidade,
      complemento,
      ddd,
      telefone,
      idEstado,
      nomeCompleto,
      enderecoDeReferenia,
      rua,
      numero,
      guid,
      documento,
    });

    await criarTag({
      GUID: guid,
      chave: "99Food-customerId",
      valor: pedido.order_info.receive_address.uid,
    });

    console.log("✅ novo cliente adicionado");
    return cliente.IDCliente;
  }

  const clienteExistente = await buscarClientePorGUID({
    guid: clienteExistenteTag.GUIDIdentificacao,
  });

  await atualizarCliente({
    bairro,
    cep,
    cidade,
    complemento,
    enderecoDeReferenia,
    rua,
    numero,
    idCliente: clienteExistente.IDCliente,
    idEstado,
    nomeCompleto,
    ddd,
    telefone,
    documento,
  });

  console.log("✅ Dados do cliente atualizado");
  return clienteExistente.IDCliente;
};
