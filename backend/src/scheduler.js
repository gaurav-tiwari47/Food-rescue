// src/scheduler.js
// PURPOSE: Background job that auto-releases expired pending reservations.
//          Runs every 60 seconds. Finds listings where:
//            status = "pending" AND claimExpiresAt < now
//          Resets them back to "available" so other users can request them.
//
// WHY: Prevents no-show users from permanently blocking a food listing.
//      Without this, a requester could request food and then ghost the donor,
//      making the listing permanently unavailable.
//
// CONNECTS TO: server.js (called on startup after DB connects)

const Food = require("./models/Food");

const INTERVAL_MS = 60 * 1000; // Run every 60 seconds

const releaseExpiredReservations = async () => {
  try {
    const now = new Date();

    // Find all pending listings whose 30-minute window has elapsed
    const result = await Food.updateMany(
      {
        status: "pending",
        claimExpiresAt: { $lt: now },
      },
      {
        $set: {
          status: "available",
          claimedBy: null,
          claimRequestedAt: null,
          claimExpiresAt: null,
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `🔄 Scheduler: Released ${result.modifiedCount} expired reservation(s) at ${now.toISOString()}`
      );
    }
  } catch (err) {
    // Log but don't crash — scheduler must keep running
    console.error("❌ Scheduler error (releaseExpiredReservations):", err.message);
  }
};

// Also mark food listings as expired if their expiryTime has passed
const markExpiredListings = async () => {
  try {
    const now = new Date();

    const result = await Food.updateMany(
      {
        status: "available",        // Only auto-expire still-available listings
        expiryTime: { $lt: now },
      },
      {
        $set: { status: "expired" },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `⏰ Scheduler: Marked ${result.modifiedCount} listing(s) as expired at ${now.toISOString()}`
      );
    }
  } catch (err) {
    console.error("❌ Scheduler error (markExpiredListings):", err.message);
  }
};

const startScheduler = () => {
  console.log("⏱  Scheduler started — checking every 60 seconds");

  // Run immediately on startup, then on interval
  releaseExpiredReservations();
  markExpiredListings();

  setInterval(async () => {
    await releaseExpiredReservations();
    await markExpiredListings();
  }, INTERVAL_MS);
};

module.exports = { startScheduler };
