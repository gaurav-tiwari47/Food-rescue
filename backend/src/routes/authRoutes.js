// src/routes/authRoutes.js
// PURPOSE: Maps HTTP endpoints for auth to their controller functions.
// CONNECTS TO: app.js (mounted at /api/auth), authController.js, authMiddleware.js

const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getMe); // Protected: must send JWT

module.exports = router;
