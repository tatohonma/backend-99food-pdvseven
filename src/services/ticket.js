export const formatarTicket = ({ pedido, pagamento }) => {
  let ticket = ` *** 99Food #${pedido.order_info.remark} ***\r\n`;
  ticket += `Data do Pedido: ${new Date(pedido.order_info.create_time).toLocaleString()}\r\n`;
  ticket += `Cliente: ${pedido.order_info.receive_address.first_name}\r\n`;
  ticket += `Telefone: (${pedido.order_info.receive_address.phone.substring(0, 2)}) ${pedido.order_info.receive_address.phone.substring(2)}\r\n`;
  ticket += `Endereço: ${pedido.order_info.receive_address.poi_address}\r\n`;
  ticket += `Cidade: ${pedido.order_info.receive_address.city} - ${pedido.order_info.receive_address.state}\r\n`;
  ticket += `CEP: ${pedido.order_info.receive_address.postal_code}\r\n`;
  ticket += `Referência: ${pedido.order_info.receive_address.reference}\r\n`;
  ticket += `Complemento: ${pedido.order_info.receive_address.complement}\r\n\r\n`;

  ticket += `Itens:\r\n`;
  pedido.order_info.order_items.forEach((item) => {
    ticket += `  - ${item.amount} x ${item.name}: R$ ${item.total_price / 100}\r\n`;
    if (item.remark) ticket += `    Observações: ${item.remark}\r\n`;

    //adicionar subitens ao ticket
    item.sub_item_list.forEach((subItem) => {
      ticket += `    - ${subItem.amount} x ${subItem.name}: R$ ${subItem.total_price / 100}\r\n`;
      if (subItem.remark) ticket += `      Observações: ${subItem.remark}\r\n`;
    });
  });

  // ticket += `\r\nDescontos:\r\n`;
  // pedido.order_info.discounts.forEach((discount) => {
  //   ticket += `  - ${discount.tag}: R$ ${discount.amount.toFixed(2)}\r\n`;
  // });
  // ticket += `\r\nTaxa de Entrega: R$ ${pedido.order_info.deliveryFee.toFixed(2)}\r\n`;
  //

  if (pagamento.value > 0) {
    ticket += `\r\nPagamentos:\r\n`;
    ticket += `  - ${pagamento.value / 100}`;
  }

  ticket += `\r\nTotal: R$ ${pedido.order_info.price.order_price / 100}\r\n`;

  return ticket;
};
