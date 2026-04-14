// src/routes/aiRoutes.js
// PURPOSE: Maps AI feature endpoints to their controller functions.
// CONNECTS TO: app.js (mounted at /api/ai), aiController.js
//
// Routes:
//   POST /api/ai/generate-description  → Generate listing description
//   POST /api/ai/detect-category       → Auto-detect food category
//   POST /api/ai/translate             → Translate listing text

const express = require("express");
const router = express.Router();
const { generateDescription, detectCategory, translateText } = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

// Description generation and category detection require login
// (prevents abuse of paid AI API by anonymous users)
router.post("/generate-description", protect, generateDescription);
router.post("/detect-category", protect, detectCategory);

// Translation is public — helps NGOs/recipients read listings in their language
router.post("/translate", translateText);

module.exports = router;
