// src/models/Food.js
// PURPOSE: Defines the Food listing schema for MongoDB.
// CHANGE: Replaced old status enum (available/claimed/expired) with full reservation
//         workflow enum (available/pending/picked_up/cancelled/expired).
//         Added claimRequestedAt, claimExpiresAt, pickedUpAt, cancelledAt fields.
// CONNECTS TO: foodController.js, scheduler.js

const mongoose = require("mongoose");

const foodSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Food title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    quantity: {
      type: String,
      required: [true, "Quantity is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["cooked", "raw", "packaged", "beverages", "bakery", "other"],
      default: "other",
    },
    expiryTime: {
      type: Date,
      required: [true, "Expiry time is required"],
    },
    pickupAddress: {
      type: String,
      required: [true, "Pickup address is required"],
      trim: true,
    },
    latitude:  { type: Number, default: null },
    longitude: { type: Number, default: null },
    contactNumber: {
      type: String,
      required: [true, "Contact number is required"],
      trim: true,
    },
    imageUrl: { type: String, default: "" },

    // ── Reservation Workflow ────────────────────────────────────────────────
    // available  = open for pickup requests
    // pending    = reserved for one requester (30-minute window)
    // picked_up  = donor confirmed the food was collected
    // cancelled  = donor or requester cancelled the reservation
    // expired    = food expiry time passed without pickup (set by scheduler)
    status: {
      type: String,
      enum: ["available", "pending", "picked_up", "cancelled", "expired"],
      default: "available",
    },

    // Who created this listing (donor)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Who requested this food (requester)
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ── Reservation Timestamps ──────────────────────────────────────────────
    claimRequestedAt: { type: Date, default: null }, // When requester clicked "Request Food"
    claimExpiresAt:   { type: Date, default: null }, // claimRequestedAt + 30 minutes
    pickedUpAt:       { type: Date, default: null }, // When donor clicked "Confirm Pickup"
    cancelledAt:      { type: Date, default: null }, // When cancelled
  },
  { timestamps: true }
);

// Compound index for scheduler: find expired pending reservations efficiently
foodSchema.index({ status: 1, claimExpiresAt: 1 });
// Home page: available listings, newest first
foodSchema.index({ status: 1, createdAt: -1 });
// Dashboard: my listings
foodSchema.index({ createdBy: 1 });
// Dashboard: my requests
foodSchema.index({ claimedBy: 1, status: 1 });

module.exports = mongoose.model("Food", foodSchema);
