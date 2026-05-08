export function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL || "/api";
}

export function getSocketUrl() {
  return import.meta.env.VITE_SOCKET_URL || window.location.origin;
}
