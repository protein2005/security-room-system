import { http } from "./http";

export async function fetchAlarms(params = {}) {
  const response = await http.get("/alarms", { params });
  return response.data;
}
