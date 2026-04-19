import { useEffect } from "react";
import { io } from "socket.io-client";

import { useAuth } from "@/features/auth/auth-provider";

export function RealtimeProvider({ children, queryClient }) {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const socket = io("http://localhost:4000");
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
    const invalidateCommands = () => {
      queryClient.invalidateQueries({ queryKey: ["commands"] });
      queryClient.invalidateQueries({ queryKey: ["room-commands"] });
    };

    socket.on("device:seen", invalidateDevices);
    socket.on("device:status-changed", invalidateDevices);
    socket.on("room:state-updated", invalidateRooms);
    socket.on("room:telemetry", invalidateTelemetry);
    socket.on("alarm:triggered", invalidateAlarms);
    socket.on("event:created", invalidateEvents);
    socket.on("command:updated", invalidateCommands);

    return () => {
      socket.off("device:seen", invalidateDevices);
      socket.off("device:status-changed", invalidateDevices);
      socket.off("room:state-updated", invalidateRooms);
      socket.off("room:telemetry", invalidateTelemetry);
      socket.off("alarm:triggered", invalidateAlarms);
      socket.off("event:created", invalidateEvents);
      socket.off("command:updated", invalidateCommands);
      socket.disconnect();
    };
  }, [isAuthenticated, queryClient]);

  return children;
}
