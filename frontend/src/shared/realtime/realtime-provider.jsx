import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

import { useAuth } from "@/features/auth/auth-provider";

export function RealtimeProvider({ children, queryClient }) {
  const { isAuthenticated } = useAuth();
  const dashboardRefreshTimeoutRef = useRef(null);
  const alarmStateByRoomRef = useRef(new Map());

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    const socket = io("http://localhost:4000");
    const scheduleDashboardRefresh = () => {
      if (dashboardRefreshTimeoutRef.current) {
        return;
      }

      dashboardRefreshTimeoutRef.current = window.setTimeout(() => {
        dashboardRefreshTimeoutRef.current = null;
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      }, 5000);
    };

    const mergeById = (items, nextItem, idField) => {
      if (!Array.isArray(items)) {
        return items;
      }

      const existingIndex = items.findIndex((item) => item?.[idField] === nextItem?.[idField]);
      if (existingIndex === -1) {
        return items;
      }

      const updatedItems = [...items];
      updatedItems[existingIndex] = { ...updatedItems[existingIndex], ...nextItem };
      return updatedItems;
    };

    const updateDeviceCaches = (device) => {
      if (!device?.deviceId) {
        return;
      }

      queryClient.setQueryData(["devices"], (current) => mergeById(current, device, "deviceId"));
      queryClient.setQueryData(["devices", "unprovisioned"], (current) => {
        if (!Array.isArray(current)) {
          return current;
        }

        if (device.provisioned) {
          return current.filter((item) => item?.deviceId !== device.deviceId);
        }

        const existingIndex = current.findIndex((item) => item?.deviceId === device.deviceId);
        if (existingIndex === -1) {
          return [device, ...current];
        }

        const updatedDevices = [...current];
        updatedDevices[existingIndex] = { ...updatedDevices[existingIndex], ...device };
        return updatedDevices;
      });
      queryClient.setQueryData(["dashboard"], (current) => {
        if (!current?.devices) {
          return current;
        }

        return {
          ...current,
          devices: mergeById(current.devices, device, "deviceId"),
        };
      });
      scheduleDashboardRefresh();
    };

    const updateRoomCaches = (roomState) => {
      if (!roomState?.roomId) {
        return;
      }

      queryClient.setQueryData(["room-state", roomState.roomId], (current) => ({
        ...(current || {}),
        ...roomState,
      }));
      queryClient.setQueryData(["room", roomState.roomId], (current) => (
        current ? { ...current, ...roomState } : current
      ));
      queryClient.setQueryData(["rooms"], (current) => mergeById(current, roomState, "roomId"));
      queryClient.setQueryData(["dashboard"], (current) => {
        if (!current?.rooms) {
          return current;
        }

        return {
          ...current,
          rooms: mergeById(current.rooms, roomState, "roomId"),
        };
      });
      scheduleDashboardRefresh();
    };

    const appendTelemetryToCache = (telemetry) => {
      if (!telemetry?.roomId) {
        return;
      }

      queryClient.setQueryData(["room-telemetry", telemetry.roomId], (current) => {
        if (!Array.isArray(current)) {
          return current;
        }

        const deduplicated = current.filter((item) => item?._id !== telemetry._id);
        return [telemetry, ...deduplicated].slice(0, current.length || 24);
      });
    };

    const syncAlarmState = ({ roomId, alarmActive, alarmReason, alarmSilenced }) => {
      if (!roomId) {
        return;
      }

      const nextSignature = JSON.stringify({
        alarmActive: Boolean(alarmActive),
        alarmReason: alarmReason || null,
        alarmSilenced: Boolean(alarmSilenced),
      });
      const previousSignature = alarmStateByRoomRef.current.get(roomId);

      alarmStateByRoomRef.current.set(roomId, nextSignature);

      if (previousSignature !== undefined && previousSignature !== nextSignature) {
        invalidateAlarms();
      }
    };

    const handleDeviceSeen = (device) => {
      updateDeviceCaches(device);
    };

    const handleDeviceStatusChanged = (device) => {
      updateDeviceCaches(device);
    };

    const handleRoomStateUpdated = (roomState) => {
      updateRoomCaches(roomState);
      if (Object.hasOwn(roomState || {}, "alarmActive") || Object.hasOwn(roomState || {}, "alarmReason") || Object.hasOwn(roomState || {}, "alarmSilenced")) {
        syncAlarmState(roomState);
      }
    };

    const handleRoomTelemetry = (telemetry) => {
      appendTelemetryToCache(telemetry);
      updateRoomCaches({
        roomId: telemetry.roomId,
        deviceId: telemetry.deviceId,
        temperature: telemetry.temperature,
        humidity: telemetry.humidity,
        motion: telemetry.motion,
        door: telemetry.door,
        armed: telemetry.armed,
        offline: telemetry.offline,
        sensorFailure: telemetry.sensorFailure,
        alarmActive: telemetry.alarmActive,
        alarmSilenced: telemetry.alarmSilenced,
        alarmReason: telemetry.alarmReason,
        lastTelemetryAt: telemetry.receivedAt,
        updatedAt: telemetry.receivedAt,
      });
      syncAlarmState(telemetry);
    };

    const invalidateAlarms = () => {
      queryClient.invalidateQueries({ queryKey: ["alarms"] });
      queryClient.invalidateQueries({ queryKey: ["room-alarms"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    };

    const invalidateEvents = () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["room-events"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    };

    const invalidateCommands = () => {
      queryClient.invalidateQueries({ queryKey: ["commands"] });
      queryClient.invalidateQueries({ queryKey: ["room-commands"] });
    };

    socket.on("device:seen", handleDeviceSeen);
    socket.on("device:status-changed", handleDeviceStatusChanged);
    socket.on("room:state-updated", handleRoomStateUpdated);
    socket.on("room:telemetry", handleRoomTelemetry);
    socket.on("alarm:triggered", invalidateAlarms);
    socket.on("event:created", invalidateEvents);
    socket.on("command:updated", invalidateCommands);

    return () => {
      if (dashboardRefreshTimeoutRef.current) {
        window.clearTimeout(dashboardRefreshTimeoutRef.current);
        dashboardRefreshTimeoutRef.current = null;
      }

      alarmStateByRoomRef.current.clear();

      socket.off("device:seen", handleDeviceSeen);
      socket.off("device:status-changed", handleDeviceStatusChanged);
      socket.off("room:state-updated", handleRoomStateUpdated);
      socket.off("room:telemetry", handleRoomTelemetry);
      socket.off("alarm:triggered", invalidateAlarms);
      socket.off("event:created", invalidateEvents);
      socket.off("command:updated", invalidateCommands);
      socket.disconnect();
    };
  }, [isAuthenticated, queryClient]);

  return children;
}
