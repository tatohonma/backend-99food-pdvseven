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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function refreshToken(shopId) {
  console.log(`[TOKEN] Renovando token - shopId: ${shopId}`);

  await axios.post(
    "https://openapi.99food.com/v1/auth/authtoken/refresh",
    null,
    {
      params: {
        app_id: env.APP_ID,
        app_secret: env.APP_SECRET,
        app_shop_id: shopId,
      },
    },
  );

  console.log(`[TOKEN] Refresh realizado - shopId: ${shopId}`);

  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(
      `[TOKEN] Buscando token - shopId: ${shopId} - tentativa ${attempt}/${maxAttempts}`,
    );

    const { data } = await axios.post(
      "https://openapi.99food.com/v1/auth/authtoken/get",
      null,
      {
        params: {
          app_id: env.APP_ID,
          app_secret: env.APP_SECRET,
          app_shop_id: shopId,
        },
      },
    );

    const token = data?.data?.auth_token;

    console.log(
      `[TOKEN] Resultado - shopId: ${shopId} - possui token: ${!!token}`,
    );

    if (token) {
      tokenCache.set(shopId, {
        token,
        expirationDate: addMinutes(new Date(), 5),
      });

      console.log(`[TOKEN] Token obtido com sucesso - shopId: ${shopId}`);

      return token;
    }

    if (attempt < maxAttempts) {
      await sleep(attempt * 500);
    }
  }

  throw new Error(
    `Não foi possível obter auth_token válido para o shopId ${shopId}`,
  );
}

async function getToken(shopId) {
  const cached = tokenCache.get(shopId);

  if (cached && !isBefore(cached.expirationDate, new Date())) {
    console.log(`[TOKEN] Cache hit - shopId: ${shopId}`);

    return cached.token;
  }

  const existingRefresh = tokenRefreshPromises.get(shopId);

  if (existingRefresh) {
    console.log(`[TOKEN] Aguardando refresh existente - shopId: ${shopId}`);

    return existingRefresh;
  }

  console.log(`[TOKEN] Iniciando novo refresh - shopId: ${shopId}`);

  const refreshPromise = refreshToken(shopId);

  tokenRefreshPromises.set(shopId, refreshPromise);

  try {
    return await refreshPromise;
  } finally {
    tokenRefreshPromises.delete(shopId);
  }
}

api.interceptors.request.use(async (config) => {
  const shopId = config.shopId;

  if (!shopId) {
    throw new Error("shopId não informado.");
  }

  const token = await getToken(shopId);

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
