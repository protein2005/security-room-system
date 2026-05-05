const commandService = require("./command.service");
const { validateCommandQuery } = require("../../utils/validation");

async function getCommands(req, res, next) {
  try {
    const filters = validateCommandQuery(req.query);
    const commands = await commandService.listCommands(filters);

    res.json(commands);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getCommands,
};
