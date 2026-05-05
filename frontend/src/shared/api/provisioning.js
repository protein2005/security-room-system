import { http } from "./http";

export async function provisionDevice(deviceId, roomId) {
  const response = await http.post(`/provisioning/device/${deviceId}`, { roomId });
  return response.data;
}
