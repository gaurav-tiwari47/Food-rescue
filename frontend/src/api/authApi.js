// src/api/authApi.js
// PURPOSE: All API calls related to authentication.
//          Uses a configured Axios instance with base URL from .env.
// CONNECTS TO: AuthContext.jsx (called on login/register/me)

import axios from "axios";

// Create Axios instance with base URL from environment variable
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // http://localhost:5000/api
});

// Interceptor: Attach JWT token to every request automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loginUser = async (email, password) => {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
};

export const registerUser = async (name, email, password, role, phone) => {
  const { data } = await api.post("/auth/register", {
    name,
    email,
    password,
    role,
    phone,
  });
  return data;
};

export const getMe = async () => {
  const { data } = await api.get("/auth/me");
  return data;
};

export default api;
