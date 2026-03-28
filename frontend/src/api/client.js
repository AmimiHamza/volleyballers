import axios from "axios";
import { getItem, setItem, deleteItem } from "../utils/storage";
import { API_BASE_URL } from "../config/server";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor — attach JWT access token from SecureStore
apiClient.interceptors.request.use(async (config) => {
  // Skip token for register, login, refresh
  const publicPaths = ["/auth/login", "/auth/register", "/auth/refresh"];
  if (publicPaths.some((p) => config.url?.includes(p))) {
    return config;
  }
  // Don't override if already set (e.g. during bootstrap in AuthContext)
  if (config.headers.Authorization) {
    return config;
  }
  try {
    const token = await getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // SecureStore unavailable
  }
  return config;
});

// Response interceptor — on 401, try token refresh once
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh for 401s on non-auth endpoints
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/register") ||
      originalRequest.url?.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await getItem("refresh_token");
      if (!refreshToken) throw new Error("No refresh token");

      const res = await apiClient.post("/auth/refresh", { refresh_token: refreshToken });
      const newAccessToken = res.data.data.access_token;
      await setItem("access_token", newAccessToken);

      processQueue(null, newAccessToken);
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      // Clear tokens — user needs to log in again
      await deleteItem("access_token");
      await deleteItem("refresh_token");
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default apiClient;
