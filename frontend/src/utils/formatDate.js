// src/utils/formatDate.js
// PURPOSE: Human-readable date/time formatting helpers used across the app.

// Format ISO date to readable string: "Jan 15, 2024 at 3:00 PM"
export const formatDate = (isoString) => {
  if (!isoString) return "N/A";
  return new Date(isoString).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Returns how much time is left until expiry (e.g. "2h 30m left")
export const timeUntilExpiry = (isoString) => {
  if (!isoString) return "";

  const now = new Date();
  const expiry = new Date(isoString);
  const diff = expiry - now;

  if (diff <= 0) return "Expired";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d left`;
  }
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
};

// Returns true if the expiry time has passed
export const isExpired = (isoString) => {
  return new Date(isoString) < new Date();
};
