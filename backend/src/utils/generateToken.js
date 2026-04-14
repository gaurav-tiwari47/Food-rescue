// src/utils/generateToken.js
// PURPOSE: Generates a signed JWT for authenticated sessions.
// CONNECTS TO: authController.js (called after login/register)

const jwt = require("jsonwebtoken");

const generateToken = (id) => {
  return jwt.sign(
    { id }, // Payload: only store user ID (minimal, secure)
    process.env.JWT_SECRET,
    { expiresIn: "7d" } // Token expires in 7 days
  );
};

module.exports = generateToken;
