const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  getMe,
} = require("../controllers/authController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getMe);

// Admin only route for testing
router.get("/admin", protect, authorize("admin"), (req, res) => {
  res
    .status(200)
    .json({
      message: "Welcome Admin. You have access to this protected route.",
    });
});

module.exports = router;
