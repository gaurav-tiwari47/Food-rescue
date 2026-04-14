// src/routes/foodRoutes.js
// PURPOSE: Maps HTTP endpoints to food controller functions.
// CHANGE: Replaced PUT /:id/claim with three new routes:
//         PUT /:id/request  → reserve food (pending)
//         PUT /:id/complete → donor confirms pickup (picked_up)
//         PUT /:id/cancel   → cancel reservation (back to available)
//         Added GET /my-requests for requester's own requests.
//
// ⚠️  ROUTE ORDER IS CRITICAL IN EXPRESS:
//     Named sub-paths (/my, /my-requests, /claimed) MUST come before /:id
//     Specific sub-routes (/:id/request, /:id/complete, /:id/cancel)
//     MUST come before the generic /:id PUT handler

const express = require("express");
const router = express.Router();
const {
  getAllFood,
  getMyListings,
  getMyRequests,
  getFoodById,
  createFood,
  updateFood,
  requestFood,
  completePickup,
  cancelRequest,
  deleteFood,
} = require("../controllers/foodController");
const { protect } = require("../middleware/authMiddleware");

// ── Public ───────────────────────────────────────────────────────────────────
router.get("/", getAllFood);

// ── Private — named paths BEFORE /:id ────────────────────────────────────────
router.get("/my", protect, getMyListings);           // My listings as donor
router.get("/my-requests", protect, getMyRequests);  // My requests as requester
router.post("/", protect, createFood);

// ── Param routes — more specific paths before generic /:id ───────────────────
router.get("/:id", getFoodById);

// Workflow action routes (more specific, must come before PUT /:id)
router.put("/:id/request",  protect, requestFood);    // NEW: Request food
router.put("/:id/complete", protect, completePickup); // NEW: Confirm pickup (donor)
router.put("/:id/cancel",   protect, cancelRequest);  // NEW: Cancel reservation

// Generic update (edit listing) — least specific, must be last among PUT /:id*
router.put("/:id", protect, updateFood);

router.delete("/:id", protect, deleteFood);

module.exports = router;
