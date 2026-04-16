const { env } = require("../config/env");
const { Device } = require("../modules/devices/device.model");
const { Room } = require("../modules/rooms/room.model");
const { upsertRoomCurrentState } = require("../modules/room-current-state/room-current-state.service");
const { logger } = require("../utils/logger");

function startDeviceOfflineJob({ io }) {
  const intervalId = setInterval(async () => {
    const cutoff = new Date(Date.now() - env.deviceOfflineThresholdMs);

    try {
      const staleDevices = await Device.find({
        online: true,
        lastSeenAt: { $lt: cutoff },
      }).lean();

      if (staleDevices.length === 0) {
        return;
      }

      await Device.updateMany(
        {
          _id: { $in: staleDevices.map((device) => device._id) },
        },
        {
          $set: {
            online: false,
            lastStatus: "OFFLINE",
            wifiOk: false,
            mqttOk: false,
          },
        }
      );

      for (const device of staleDevices) {
        if (device.currentRoomId) {
          await upsertRoomCurrentState(device.currentRoomId, {
            deviceId: device.deviceId,
            offline: true,
            wifiOk: false,
            mqttOk: false,
          });

          await Room.findOneAndUpdate(
            { roomId: device.currentRoomId },
            {
              $set: {
                deviceId: device.deviceId,
              },
            }
          );
        }

        const offlineDevice = {
          ...device,
          online: false,
          lastStatus: "OFFLINE",
          wifiOk: false,
          mqttOk: false,
        };

        if (io) {
          io.emit("device:status-changed", offlineDevice);
          if (device.currentRoomId) {
            io.emit("room:state-updated", {
              roomId: device.currentRoomId,
              deviceId: device.deviceId,
              offline: true,
              wifiOk: false,
              mqttOk: false,
            });
          }
        }
      }

      logger.info(`Marked ${staleDevices.length} device(s) as offline`);
    } catch (error) {
      logger.error("Device offline job failed", error);
    }
  }, env.deviceOfflineCheckIntervalMs);

  return intervalId;
}

module.exports = { startDeviceOfflineJob };
