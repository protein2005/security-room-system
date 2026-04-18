import { http } from "./http";

export async function fetchDevices(params = {}) {
  const response = await http.get("/devices", { params });
  return response.data;
}

export async function fetchUnprovisionedDevices() {
  const response = await http.get("/devices/unprovisioned");
  return response.data;
}
