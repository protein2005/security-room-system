const { RoomCurrentState } = require("./room-current-state.model");

async function getRoomCurrentState(roomId) {
  return RoomCurrentState.findOne({ roomId }).lean();
}

async function upsertRoomCurrentState(roomId, updates) {
  return RoomCurrentState.findOneAndUpdate(
    { roomId },
    {
      $set: {
        ...updates,
        updatedAt: new Date(),
      },
      $setOnInsert: {
        roomId,
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  ).lean();
}

module.exports = {
  getRoomCurrentState,
  upsertRoomCurrentState,
};
