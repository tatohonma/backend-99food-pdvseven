export const calcularTotais = (pedido) => {
  const servicePrice = pedido.price?.others_fees?.service_price ?? 0;
  const mealTopUpPrice = pedido.price?.others_fees?.meal_top_up_price ?? 0;
  const outrasTaxas = servicePrice + mealTopUpPrice;

  const valorDesconto = (pedido.promotions ?? []).reduce((sum, item) => {
    return (
      sum + (item?.promo_discount ?? 0) + (item?.shop_subside_price ?? 0)
    );
  }, 0);

  const taxaEntrega = pedido.price?.store_charged_delivery_price ?? 0;

  const valorTotal =
    pedido.price.order_price + outrasTaxas + taxaEntrega - valorDesconto;

  return {
    outrasTaxas,
    valorDesconto,
    taxaEntrega,
    valorTotal,
  };
};
