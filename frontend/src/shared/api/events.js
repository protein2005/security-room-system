import { http } from "./http";

export async function fetchEvents(params = {}) {
  const response = await http.get("/events", { params });
  return response.data;
}
