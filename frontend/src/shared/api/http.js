import axios from "axios";
import { clearAccessToken, getAccessToken } from "@/shared/auth/token-storage";

export const http = axios.create({
  baseURL: "http://localhost:4000/api",
  timeout: 10000,
});

http.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAccessToken();

      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  }
);
