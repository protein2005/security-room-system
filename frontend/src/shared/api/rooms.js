import { http } from "./http";

export async function fetchRooms() {
  const response = await http.get("/rooms");
  return response.data;
}

export async function createRoom(payload) {
  const response = await http.post("/rooms", payload);
  return response.data;
}

export async function fetchRoom(roomId) {
  const response = await http.get(`/rooms/${roomId}`);
  return response.data;
}

export async function fetchRoomState(roomId) {
  const response = await http.get(`/rooms/${roomId}/state`);
  return response.data;
}

export async function fetchRoomTelemetry(roomId, limit = 24) {
  const response = await http.get(`/rooms/${roomId}/telemetry`, {
    params: { limit },
  });
  return response.data;
}

export async function fetchRoomAlarms(roomId, params = {}) {
  const response = await http.get(`/rooms/${roomId}/alarms`, { params });
  return response.data;
}

export async function fetchRoomEvents(roomId, params = {}) {
  const response = await http.get(`/rooms/${roomId}/events`, { params });
  return response.data;
}

export async function fetchRoomCommands(roomId, params = {}) {
  const response = await http.get(`/rooms/${roomId}/commands`, { params });
  return response.data;
}

export async function armRoom(roomId) {
  const response = await http.post(`/rooms/${roomId}/arm`);
  return response.data;
}

export async function disarmRoom(roomId) {
  const response = await http.post(`/rooms/${roomId}/disarm`);
  return response.data;
}

export async function resetRoomAlarm(roomId) {
  const response = await http.post(`/rooms/${roomId}/reset-alarm`);
  return response.data;
}

export async function updateRoomThresholds(roomId, payload) {
  const response = await http.post(`/rooms/${roomId}/thresholds`, payload);
  return response.data;
}
