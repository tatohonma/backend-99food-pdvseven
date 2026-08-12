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

async function refreshToken(shopId) {
  const url = `https://openapi.99food.com/v1/auth/authtoken/refresh?app_id=${env.APP_ID}&app_secret=${env.APP_SECRET}&app_shop_id=${shopId}`;

  await axios.post(url);

  const tokenUrl = `https://openapi.99food.com/v1/auth/authtoken/get?app_id=${env.APP_ID}&app_secret=${env.APP_SECRET}&app_shop_id=${shopId}`;

  const { data } = await axios.post(tokenUrl);

  tokenCache.set(shopId, {
    token: data.data.auth_token,
    expirationDate: addMinutes(new Date(), 5),
  });

  return data.data.auth_token;
}

async function getToken(shopId) {
  const cached = tokenCache.get(shopId);

  if (!cached || isBefore(cached.expirationDate, new Date())) {
    return refreshToken(shopId);
  }

  return cached.token;
}

api.interceptors.request.use(async (config) => {
  const shopId = config.shopId;

  if (!shopId) {
    throw new Error("shopId não informado.");
  }

  const token = await getToken(shopId);

  config.params = {
    ...config.params,
    auth_token: token,
  };

  return config;
});
