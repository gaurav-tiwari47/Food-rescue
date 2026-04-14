// src/api/aiApi.js
// PURPOSE: All API calls for AI-powered features.
//          Reuses the same Axios instance as authApi (includes JWT interceptor).
// CONNECTS TO: AddFood.jsx, EditFood.jsx, FoodCard.jsx

import api from "./authApi";

// Generate a polished food description from title + quantity + category
export const generateDescription = async ({ title, quantity, category }) => {
  const { data } = await api.post("/ai/generate-description", { title, quantity, category });
  return data.description; // returns plain string
};

// Detect the best category for a given food title
export const detectCategory = async (title) => {
  const { data } = await api.post("/ai/detect-category", { title });
  return data.category; // returns one of: cooked, raw, packaged, beverages, bakery, other
};

// Translate text to a supported language ("hindi" | "english")
export const translateText = async (text, language) => {
  const { data } = await api.post("/ai/translate", { text, language });
  return data.translatedText; // returns translated string
};
