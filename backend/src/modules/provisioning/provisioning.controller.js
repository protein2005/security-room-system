const provisioningService = require("./provisioning.service");

async function provisionDevice(req, res, next) {
  try {
    const roomId = req.body.roomId;

    if (!roomId || typeof roomId !== "string") {
      return res.status(400).json({ message: "roomId is required" });
    }

    const result = await provisioningService.provisionDevice({
      deviceId: req.params.deviceId,
      roomId,
      requestedBy: req.auth,
    });

    res.status(202).json(result);
  } catch (error) {
    next(error);
  }
}

module.exports = { provisionDevice };
