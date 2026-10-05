export const resumirErro = (error) => {
  if (!error) return "erro desconhecido";

  const config = error.config;
  const partes = [error.code, error.message];

  if (config) {
    partes.push(`${config.method?.toUpperCase()} ${config.url}`);
    if (config.params?.order_id) partes.push(`order_id=${config.params.order_id}`);
  }

  if (error.response) {
    partes.push(
      `status=${error.response.status}`,
      `resposta=${JSON.stringify(error.response.data)}`,
    );
  }

  return partes.filter(Boolean).join(" | ");
};

export const logErro = (contexto, error) => {
  const isAxios = error?.isAxiosError;
  console.error(`${contexto}: ${isAxios ? resumirErro(error) : ""}`.trimEnd());
  if (!isAxios) console.error(error);
};
