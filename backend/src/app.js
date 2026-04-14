// src/app.js
// PURPOSE: Express application setup — middleware, routes, error handlers.
// CHANGE: Added /api/ai route registration for AI features.
// CONNECTS TO: server.js (imported), all routes and middleware

const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const foodRoutes = require("./routes/foodRoutes");
const aiRoutes = require("./routes/aiRoutes");          // NEW: AI features
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health Check ───────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Food Rescue API is running 🥗",
    aiProvider: process.env.AI_PROVIDER || "gemini",
  });
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/food", foodRoutes);
app.use("/api/ai", aiRoutes);               // NEW: AI routes mounted here

// ── Error Handling ─────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
