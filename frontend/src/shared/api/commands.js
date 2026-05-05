import { http } from "./http";

export async function fetchCommands(params = {}) {
  const response = await http.get("/commands", { params });
  return response.data;
}
