const express = require("express");

const userController = require("./user.controller");
const { requireAuth, requireRole } = require("../../middleware/auth.middleware");

const router = express.Router();

router.use(requireAuth);
router.get("/", requireRole(["admin"]), userController.listUsers);
router.post("/", requireRole(["admin"]), userController.createUser);
router.patch("/me", userController.updateProfile);
router.delete("/:userId", requireRole(["admin"]), userController.deleteUser);

module.exports = router;
