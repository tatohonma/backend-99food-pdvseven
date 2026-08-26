import axios from "axios";
import { env } from "./env.js";
import { addMinutes, isBefore } from "date-fns";
import JSONbig from "json-bigint";

export const api = axios.create({
  baseURL: "https://openapi.99food.com/v1",

  transformResponse: [
    (data) => {
      if (!data) return data;

      try {
        return JSONbig.parse(data);
      } catch {
        return data;
      }
    },
  ],
});

const tokenCache = new Map();
const tokenRefreshPromises = new Map();

async function refreshToken(shopId) {
  console.log(`[TOKEN] Renovando token - shopId: ${shopId}`);

  const url =
    `https://openapi.99food.com/v1/auth/authtoken/refresh` +
    `?app_id=${env.APP_ID}` +
    `&app_secret=${env.APP_SECRET}` +
    `&app_shop_id=${shopId}`;

  await axios.post(url);

  console.log(`[TOKEN] Refresh realizado - shopId: ${shopId}`);

  const tokenUrl =
    `https://openapi.99food.com/v1/auth/authtoken/get` +
    `?app_id=${env.APP_ID}` +
    `&app_secret=${env.APP_SECRET}` +
    `&app_shop_id=${shopId}`;

  const { data } = await axios.post(tokenUrl);

  const token = data?.data?.auth_token;

  console.log(
    `[TOKEN] Token recebido - shopId: ${shopId} - possui token: ${!!token}`,
  );

  if (!token) {
    throw new Error(
      `A 99Food retornou auth_token vazio para o shopId ${shopId}`,
    );
  }

  tokenCache.set(shopId, {
    token,
    expirationDate: addMinutes(new Date(), 5),
  });

  return token;
}

async function getToken(shopId) {
  const cached = tokenCache.get(shopId);

  /**
   * Token ainda válido.
   */
  if (cached && !isBefore(cached.expirationDate, new Date())) {
    console.log(`[TOKEN] Cache hit - shopId: ${shopId}`);

    return cached.token;
  }

  /**
   * Já existe uma renovação acontecendo.
   *
   * Em vez de iniciar outra, aguardamos a mesma Promise.
   */
  const existingRefresh = tokenRefreshPromises.get(shopId);

  if (existingRefresh) {
    console.log(`[TOKEN] Aguardando refresh existente - shopId: ${shopId}`);

    return existingRefresh;
  }

  /**
   * Nenhum refresh acontecendo.
   *
   * Criamos uma única Promise de renovação.
   */
  console.log(`[TOKEN] Iniciando novo refresh - shopId: ${shopId}`);

  const refreshPromise = refreshToken(shopId);

  tokenRefreshPromises.set(shopId, refreshPromise);

  try {
    return await refreshPromise;
  } finally {
    /**
     * Quando terminar, removemos a Promise.
     *
     * Se tiver dado erro ou sucesso, uma próxima requisição
     * poderá tentar renovar novamente.
     */
    tokenRefreshPromises.delete(shopId);
  }
}

api.interceptors.request.use(async (config) => {
  const shopId = config.shopId;

  if (!shopId) {
    throw new Error("shopId não informado.");
  }

  const token = await getToken(shopId);

  /**
   * Nunca deixa uma requisição sair sem auth_token.
   */
  if (!token) {
    throw new Error(`auth_token vazio para o shopId ${shopId}`);
  }

  config.params = {
    ...config.params,
    auth_token: token,
  };

  console.log(
    `[API] Requisição - shopId: ${shopId} - auth_token presente: ${!!token}`,
  );

  return config;
});
