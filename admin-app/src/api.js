import axios from "axios";
import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "alex_admin_access";
const REFRESH_KEY = "alex_admin_refresh";

const DEFAULT_URL = "https://portfolio-a6in.onrender.com";
const BASE = (process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL).replace(/\/+$/, "");
export const API = `${BASE}/api`;

let accessToken = null;
let refreshToken = null;
let refreshPromise = null;

export async function loadTokens() {
  try {
    accessToken = await SecureStore.getItemAsync(ACCESS_KEY);
    refreshToken = await SecureStore.getItemAsync(REFRESH_KEY);
  } catch {
    accessToken = null;
    refreshToken = null;
  }
}

export async function saveTokens(access, refresh) {
  accessToken = access;
  refreshToken = refresh;
  await SecureStore.setItemAsync(ACCESS_KEY, access);
  if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh);
}

export async function clearTokens() {
  accessToken = null;
  refreshToken = null;
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export function hasRefreshToken() {
  return !!refreshToken;
}

async function refreshAccessToken() {
  if (!refreshToken) throw new Error("No refresh token");
  const { data } = await axios.post(`${API}/auth/refresh-token`, {
    refresh_token: refreshToken,
  });
  accessToken = data.access_token;
  await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
  return accessToken;
}

export const client = axios.create({ baseURL: API });

client.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null;
          });
        }
        await refreshPromise;
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${accessToken}`;
        return client(original);
      } catch {
        await clearTokens();
      }
    }
    return Promise.reject(error);
  }
);
