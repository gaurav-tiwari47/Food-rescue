// src/api/foodApi.js
// PURPOSE: All API calls related to food listings.
// CHANGE: Replaced claimFoodListing with requestFood, completePickup, cancelRequest.
//         Added fetchMyRequests for the requester's "My Requests" tab.
// CONNECTS TO: Home.jsx, Dashboard.jsx, AddFood.jsx, EditFood.jsx, FoodCard.jsx

import api from "./authApi";

// Fetch all food listings (public; defaults to available on backend)
export const fetchAllFood = async (params = {}) => {
  const { data } = await api.get("/food", { params });
  return data;
};

// Fetch listings I created as a donor
export const fetchMyListings = async () => {
  const { data } = await api.get("/food/my");
  return data;
};

// Fetch listings I have requested as a requester
export const fetchMyRequests = async () => {
  const { data } = await api.get("/food/my-requests");
  return data;
};

// Fetch a single listing by ID (for EditFood prefill)
export const fetchFoodById = async (id) => {
  const { data } = await api.get(`/food/${id}`);
  return data;
};

// Create a new food listing
export const createFoodListing = async (formData) => {
  const { data } = await api.post("/food", formData);
  return data;
};

// Update an existing food listing (owner only)
export const updateFoodListing = async (id, formData) => {
  const { data } = await api.put(`/food/${id}`, formData);
  return data;
};

// ── NEW: Reservation Workflow ─────────────────────────────────────────────────

// Request food (replaces instant claim — sets status to pending for 30 min)
export const requestFoodListing = async (id) => {
  const { data } = await api.put(`/food/${id}/request`);
  return data;
};

// Donor confirms the food was physically picked up (sets status to picked_up)
export const confirmPickup = async (id) => {
  const { data } = await api.put(`/food/${id}/complete`);
  return data;
};

// Cancel a pending reservation (resets to available)
export const cancelReservation = async (id) => {
  const { data } = await api.put(`/food/${id}/cancel`);
  return data;
};

// Delete a food listing
export const deleteFoodListing = async (id) => {
  const { data } = await api.delete(`/food/${id}`);
  return data;
};
