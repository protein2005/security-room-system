import { http } from "./http";

export async function fetchDashboardData() {
  const [devices, rooms, alarms, events] = await Promise.all([
    http.get("/devices"),
    http.get("/rooms"),
    http.get("/alarms", { params: { active: true, limit: 20 } }),
    http.get("/events", { params: { limit: 20 } }),
  ]);

  return {
    devices: devices.data,
    rooms: rooms.data,
    alarms: alarms.data,
    events: events.data,
  };
}
