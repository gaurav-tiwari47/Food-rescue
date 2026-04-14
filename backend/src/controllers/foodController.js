// src/controllers/foodController.js
// PURPOSE: All business logic for food listings.
// CHANGE: Replaced claimFood with three new controllers:
//         requestFood (pending), completePickup (picked_up), cancelRequest (available).
//         Updated updateFood to use new status enum.
//         Added getMyRequests to show food I've requested.
// CONNECTS TO: foodRoutes.js → Food model

const Food = require("../models/Food");

// ── Helpers ──────────────────────────────────────────────────────────────────

// Build a clean food object for responses (avoid leaking internal fields)
const PICKUP_WINDOW_MINUTES = 30;

// @desc    Get all food listings (public, defaults to available)
// @route   GET /api/food
// @access  Public
const getAllFood = async (req, res, next) => {
  try {
    const { category, status } = req.query;
    const filter = {};
    if (category) filter.category = category;
    // Allow querying any status, but default to available for the public home page
    filter.status = status || "available";

    const food = await Food.find(filter)
      .populate("createdBy", "name email role")
      .populate("claimedBy", "name email")
      .sort({ createdAt: -1 });

    res.json(food);
  } catch (error) {
    next(error);
  }
};

// @desc    Get listings created by the logged-in user (donor view)
// @route   GET /api/food/my
// @access  Private
const getMyListings = async (req, res, next) => {
  try {
    const food = await Food.find({ createdBy: req.user._id })
      .populate("claimedBy", "name email phone")
      .sort({ createdAt: -1 });
    res.json(food);
  } catch (error) {
    next(error);
  }
};

// @desc    Get food listings I have requested (requester view)
// @route   GET /api/food/my-requests
// @access  Private
const getMyRequests = async (req, res, next) => {
  try {
    // Find any listing where I am the requester, regardless of status
    const food = await Food.find({ claimedBy: req.user._id })
      .populate("createdBy", "name email")
      .sort({ claimRequestedAt: -1 });
    res.json(food);
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single food listing by ID
// @route   GET /api/food/:id
// @access  Public
const getFoodById = async (req, res, next) => {
  try {
    const food = await Food.findById(req.params.id)
      .populate("createdBy", "name email role")
      .populate("claimedBy", "name email");
    if (!food) {
      res.status(404);
      throw new Error("Food listing not found");
    }
    res.json(food);
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new food listing
// @route   POST /api/food
// @access  Private
const createFood = async (req, res, next) => {
  try {
    const {
      title, description, quantity, category,
      expiryTime, pickupAddress, latitude, longitude,
      contactNumber, imageUrl,
    } = req.body;

    if (!title || !description || !quantity || !expiryTime || !pickupAddress || !contactNumber) {
      res.status(400);
      throw new Error("Please fill all required fields");
    }

    const food = await Food.create({
      title, description, quantity,
      category: category || "other",
      expiryTime, pickupAddress,
      latitude, longitude,
      contactNumber, imageUrl,
      createdBy: req.user._id,
    });

    res.status(201).json(food);
  } catch (error) {
    next(error);
  }
};

// @desc    Edit a food listing (owner only, only if available)
// @route   PUT /api/food/:id
// @access  Private
const updateFood = async (req, res, next) => {
  try {
    const food = await Food.findById(req.params.id);
    if (!food) {
      res.status(404);
      throw new Error("Food listing not found");
    }
    if (food.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Not authorized to edit this listing");
    }
    // Cannot edit while pending or already completed
    if (["pending", "picked_up"].includes(food.status)) {
      res.status(400);
      throw new Error(`Cannot edit a listing with status "${food.status}"`);
    }

    const allowedFields = [
      "title", "description", "quantity", "category",
      "expiryTime", "pickupAddress", "latitude", "longitude",
      "contactNumber", "imageUrl",
    ];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) food[field] = req.body[field];
    });

    if (req.body.expiryTime && new Date(req.body.expiryTime) <= new Date()) {
      res.status(400);
      throw new Error("Expiry time must be in the future");
    }
    // If donor extends expiry on a cancelled/expired listing, reopen it
    if (
      ["cancelled", "expired"].includes(food.status) &&
      req.body.expiryTime &&
      new Date(req.body.expiryTime) > new Date()
    ) {
      food.status = "available";
    }

    const updated = await food.save();
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// ── NEW WORKFLOW CONTROLLERS ──────────────────────────────────────────────────

// @desc    Request food (replaces instant claim — sets status to pending)
// @route   PUT /api/food/:id/request
// @access  Private
const requestFood = async (req, res, next) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      res.status(404);
      throw new Error("Food listing not found");
    }

    // Only available listings can be requested
    if (food.status !== "available") {
      res.status(400);
      throw new Error(
        food.status === "pending"
          ? "This food is already reserved by someone else. Check back in 30 minutes."
          : `This food is ${food.status} and cannot be requested.`
      );
    }

    // Cannot request own listing
    if (food.createdBy.toString() === req.user._id.toString()) {
      res.status(400);
      throw new Error("You cannot request your own listing");
    }

    // Abuse prevention: one active pending request per user at a time
    const existingRequest = await Food.findOne({
      claimedBy: req.user._id,
      status: "pending",
    });
    if (existingRequest) {
      res.status(400);
      throw new Error(
        "You already have an active reservation. Complete or cancel it before requesting another."
      );
    }

    // Set reservation window (30 minutes from now)
    const now = new Date();
    food.status = "pending";
    food.claimedBy = req.user._id;
    food.claimRequestedAt = now;
    food.claimExpiresAt = new Date(now.getTime() + PICKUP_WINDOW_MINUTES * 60 * 1000);

    const updated = await food.save();
    await updated.populate("createdBy", "name email");
    await updated.populate("claimedBy", "name email");
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Donor confirms pickup (sets status to picked_up)
// @route   PUT /api/food/:id/complete
// @access  Private (donor/owner only)
const completePickup = async (req, res, next) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      res.status(404);
      throw new Error("Food listing not found");
    }

    // Only the listing owner (donor) can confirm pickup
    if (food.createdBy.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error("Only the food donor can confirm pickup");
    }

    if (food.status !== "pending") {
      res.status(400);
      throw new Error(
        `Cannot confirm pickup for a listing with status "${food.status}". It must be in "pending" state.`
      );
    }

    food.status = "picked_up";
    food.pickedUpAt = new Date();

    const updated = await food.save();
    await updated.populate("createdBy", "name email");
    await updated.populate("claimedBy", "name email");
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a pending reservation (donor OR requester)
// @route   PUT /api/food/:id/cancel
// @access  Private
const cancelRequest = async (req, res, next) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      res.status(404);
      throw new Error("Food listing not found");
    }

    if (food.status !== "pending") {
      res.status(400);
      throw new Error(`Cannot cancel a listing that is "${food.status}". Only pending reservations can be cancelled.`);
    }

    const isOwner = food.createdBy.toString() === req.user._id.toString();
    const isRequester = food.claimedBy?.toString() === req.user._id.toString();

    if (!isOwner && !isRequester) {
      res.status(403);
      throw new Error("Only the donor or the requester can cancel this reservation");
    }

    // Reset back to available so others can request it
    food.status = "available";
    food.claimedBy = null;
    food.claimRequestedAt = null;
    food.claimExpiresAt = null;
    food.cancelledAt = new Date();

    const updated = await food.save();
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a food listing
// @route   DELETE /api/food/:id
// @access  Private (owner or admin)
const deleteFood = async (req, res, next) => {
  try {
    const food = await Food.findById(req.params.id);

    if (!food) {
      res.status(404);
      throw new Error("Food listing not found");
    }
    if (
      food.createdBy.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      res.status(403);
      throw new Error("Not authorized to delete this listing");
    }

    await food.deleteOne();
    res.json({ message: "Listing removed successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
