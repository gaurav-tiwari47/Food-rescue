// src/server.js
// PURPOSE: Entry point — loads env, connects DB, starts Express server.
// CHANGE: Added scheduler startup after DB connects.
// CONNECTS TO: app.js, config/db.js, scheduler.js

require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const { startScheduler } = require("./scheduler"); // NEW: background job

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  // Start the background scheduler only after DB is connected
  startScheduler();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  });
});
