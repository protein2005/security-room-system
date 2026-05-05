const provisioningService = require("./provisioning.service");
const { validateProvisioningPayload } = require("../../utils/validation");

async function provisionDevice(req, res, next) {
  try {
    const { roomId } = validateProvisioningPayload(req.body);

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
