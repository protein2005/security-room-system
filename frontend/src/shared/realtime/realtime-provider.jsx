import { useEffect } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:4000");

export function RealtimeProvider({ children, queryClient }) {
  useEffect(() => {
    const invalidateDashboard = () => queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    const invalidateDevices = () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
      invalidateDashboard();
    };
    const invalidateRooms = () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["room"] });
      queryClient.invalidateQueries({ queryKey: ["room-state"] });
      invalidateDashboard();
    };
    const invalidateTelemetry = () => {
      queryClient.invalidateQueries({ queryKey: ["room-telemetry"] });
      invalidateRooms();
    };
    const invalidateAlarms = () => {
      queryClient.invalidateQueries({ queryKey: ["alarms"] });
      queryClient.invalidateQueries({ queryKey: ["room-alarms"] });
      invalidateDashboard();
    };
    const invalidateEvents = () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["room-events"] });
      invalidateDashboard();
    };

    socket.on("device:seen", invalidateDevices);
    socket.on("device:status-changed", invalidateDevices);
    socket.on("room:state-updated", invalidateRooms);
    socket.on("room:telemetry", invalidateTelemetry);
    socket.on("alarm:triggered", invalidateAlarms);
    socket.on("event:created", invalidateEvents);

    return () => {
      socket.off("device:seen", invalidateDevices);
      socket.off("device:status-changed", invalidateDevices);
      socket.off("room:state-updated", invalidateRooms);
      socket.off("room:telemetry", invalidateTelemetry);
      socket.off("alarm:triggered", invalidateAlarms);
      socket.off("event:created", invalidateEvents);
    };
  }, [queryClient]);

  return children;
}
