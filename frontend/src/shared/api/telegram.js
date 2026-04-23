import { http } from "./http";

export async function fetchTelegramStatus() {
  const response = await http.get("/telegram/me");
  return response.data;
}

export async function fetchTelegramConfig() {
  const response = await http.get("/telegram/config");
  return response.data;
}

export async function updateTelegramConfig(payload) {
  const response = await http.patch("/telegram/config", payload);
  return response.data;
}

export async function unlinkTelegram() {
  const response = await http.post("/telegram/me/unlink");
  return response.data;
}

export async function updateTelegramEnabled(enabled) {
  const response = await http.post("/telegram/me/enabled", { enabled });
  return response.data;
}
