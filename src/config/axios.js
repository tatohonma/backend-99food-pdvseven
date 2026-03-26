import axios from "axios";
import { env } from "./env.js";
import { addMinutes, isBefore } from "date-fns";

export const api = axios.create({
  baseURL: "https://openapi.didi-food.com/v1",
});

let token = null;
let expirationDate = null;

const refreshToken = async () => {
  const url = `https://openapi.didi-food.com/v1/auth/authtoken/refresh?app_id=${env.APP_ID}&app_secret=${env.APP_SECRET}&app_shop_id=${env.SHOP_ID}`;
  await axios.post(url);

  const tokenUrl = `https://openapi.didi-food.com/v1/auth/authtoken/get?app_id=${env.APP_ID}&app_secret=${env.APP_SECRET}&app_shop_id=${env.SHOP_ID}`;
  const { data } = await axios.post(tokenUrl);

  token = data.data.auth_token;
  expirationDate = addMinutes(new Date(), 10);
};

api.interceptors.request.use(async (config) => {
  if (!token || isBefore(Date.now(), expirationDate)) {
    await refreshToken();
  }

  config.params.auth_token = token;
  return config;
});
