import { http } from "./http";

export async function fetchUsers() {
  const response = await http.get("/users");
  return response.data;
}

export async function createUser(payload) {
  const response = await http.post("/users", payload);
  return response.data;
}

export async function updateCurrentUser(payload) {
  const response = await http.patch("/users/me", payload);
  return response.data;
}

export async function deleteUser(userId) {
  await http.delete(`/users/${userId}`);
}
