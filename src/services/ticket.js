export const formatarTicket = ({ pedido, pagamento }) => {
  let ticket = ` *** 99Food #${pedido.remark} ***\r\n`;
  ticket += `Data do Pedido: ${new Date(pedido.create_time).toLocaleString()}\r\n`;
  ticket += `Cliente: ${pedido.receive_address.first_name}\r\n`;
  ticket += `Telefone: (${pedido.receive_address.phone.substring(0, 2)}) ${pedido.receive_address.phone.substring(2)}\r\n`;
  ticket += `Endereço: ${pedido.receive_address.poi_address}\r\n`;
  ticket += `Cidade: ${pedido.receive_address.city} - ${pedido.receive_address.state}\r\n`;
  ticket += `CEP: ${pedido.receive_address.postal_code}\r\n`;
  ticket += `Referência: ${pedido.receive_address.reference}\r\n`;
  ticket += `Complemento: ${pedido.receive_address.complement}\r\n\r\n`;

  ticket += `Itens:\r\n`;
  pedido.order_items.forEach((item) => {
    ticket += `  - ${item.amount} x ${item.name}: R$ ${item.sku_price / 100}\r\n`;
    if (item.remark) ticket += `    Observações: ${item.remark}\r\n`;

    //adicionar subitens ao ticket
    item.sub_item_list.forEach((subItem) => {
      ticket += `    - ${subItem.amount} x ${subItem.name}: R$ ${subItem.sku_price / 100}\r\n`;
      if (subItem.remark) ticket += `      Observações: ${subItem.remark}\r\n`;
    });
  });

  const outrasTaxas =
    pedido.price?.others_fees?.service_price +
      pedido.price?.others_fees?.meal_top_up_price ?? 0;
  const valorDesconto =
    pedido.price.items_discount + pedido.price.delivery_discount;
  const taxaEntrega = pedido.price.store_charged_delivery_price;

  ticket += `\r\nDescontos: R$ ${(valorDesconto / 100).toFixed(2)}\r\n`;
  ticket += `\r\nTaxa de Entrega: R$ ${(taxaEntrega / 100).toFixed(2)}\r\n`;

  if (pagamento.value > 0) {
    ticket += `\r\nPagamentos:\r\n`;
    ticket += `  - ${pagamento.value / 100}`;
  }

  ticket += `\r\nTotal: R$ ${(pedido.price.order_price + outrasTaxas + taxaEntrega - valorDesconto) / 100}\r\n`;

  return ticket;
};
