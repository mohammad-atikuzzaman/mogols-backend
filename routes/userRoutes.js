const express = require("express");
const router = express.Router();
const {
    getUsers,
    deleteUser,
    getUserById,
    updateUser,
} = require("../controllers/userController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.route("/")
    .get(protect, authorize("admin"), getUsers);

router.route("/:id")
    .delete(protect, authorize("admin"), deleteUser)
    .get(protect, authorize("admin"), getUserById)
    .put(protect, authorize("admin"), updateUser);

module.exports = router;
