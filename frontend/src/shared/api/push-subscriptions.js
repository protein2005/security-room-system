import { http } from "./http";

export async function fetchPushSubscriptions() {
  const response = await http.get("/push-subscriptions/me");
  return response.data;
}

export async function subscribeToPush(payload) {
  const response = await http.post("/push-subscriptions/subscribe", payload);
  return response.data;
}

export async function unsubscribeFromPush(payload) {
  await http.post("/push-subscriptions/unsubscribe", payload);
}
