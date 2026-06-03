import { http } from "./http";

export async function fetchDevices(params = {}) {
  const response = await http.get("/devices", { params });
  return response.data;
}

export async function fetchUnprovisionedDevices() {
  const response = await http.get("/devices/unprovisioned");
  return response.data;
}

export async function factoryResetDevice(deviceId) {
  const response = await http.post(`/devices/${deviceId}/factory-reset`);
  return response.data;
}

export async function detachDevice(deviceId) {
  const response = await http.post(`/devices/${deviceId}/detach`);
  return response.data;
}

export async function archiveDevice(deviceId) {
  const response = await http.post(`/devices/${deviceId}/archive`);
  return response.data;
}

export async function fetchDeviceCommands(deviceId, limit = 20) {
  const response = await http.get(`/devices/${deviceId}/commands`, {
    params: { limit },
  });
  return response.data;
}
