import axios from "axios";
import { env } from "./env.js";
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

const tokenStore = new Map();
const tokenRefreshPromises = new Map();

const getStoredToken = (shopId) => tokenStore.get(shopId);
const setStoredToken = (shopId, token) => tokenStore.set(shopId, token);
const removeStoredToken = (shopId) => tokenStore.delete(shopId);

const refreshToken = async (shopId) => {
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

  if (!token) {
    throw new Error(
      `A 99Food retornou auth_token vazio para o shopId ${shopId}, \nresposta completa: ${JSON.stringify(data)}`,
    );
  }

  setStoredToken(shopId, token);
  return token;
};

const getNewToken = async (shopId) => {
  const existingRefresh = tokenRefreshPromises.get(shopId);
  if (existingRefresh) return existingRefresh;

  const refreshPromise = refreshToken(shopId);
  tokenRefreshPromises.set(shopId, refreshPromise);

  try {
    return await refreshPromise;
  } finally {
    tokenRefreshPromises.delete(shopId);
  }
};

api.interceptors.request.use(async (config) => {
  const shopId = config.shopId;
  if (!shopId) throw new Error("shopId não informado.");

  let token = getStoredToken(shopId);

  if (!token) {
    token = await getNewToken(shopId);
  }

  config.params = {
    ...config.params,
    auth_token: token,
  };

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const shopId = originalRequest.shopId;

    if (!shopId) {
      return Promise.reject(error);
    }

    const status = error.response?.status;

    if (status !== 401) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    const failedToken = originalRequest.params?.auth_token;
    const currentToken = getStoredToken(shopId);

    originalRequest._retry = true;

    if (currentToken && failedToken && currentToken !== failedToken) {
      return api(originalRequest);
    }

    try {
      if (!tokenRefreshPromises.has(shopId)) {
        removeStoredToken(shopId);
      }

      await getNewToken(shopId);

      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  },
);
