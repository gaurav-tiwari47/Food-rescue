// src/context/AuthContext.jsx
// PURPOSE: Global authentication state (user, token, login/logout).
//          Wraps the whole app so any component can access auth state.
// CONNECTS TO: main.jsx (wraps App), useAuth.js (consumer hook), authApi.js

import { createContext, useState, useEffect, useCallback } from "react";
import { loginUser, registerUser, getMe } from "../api/authApi";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);       // Current user object
  const [token, setToken] = useState(null);     // JWT token string
  const [loading, setLoading] = useState(true); // True while checking localStorage on mount

  // On app load: restore session from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }

    setLoading(false);
  }, []);

  // Persist session to localStorage whenever token/user changes
  const persistSession = (userData, tokenValue) => {
    setUser(userData);
    setToken(tokenValue);
    localStorage.setItem("token", tokenValue);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const login = async (email, password) => {
    const data = await loginUser(email, password);
    persistSession(
      { _id: data._id, name: data.name, email: data.email, role: data.role },
      data.token
    );
    return data;
  };

  const register = async (name, email, password, role, phone) => {
    const data = await registerUser(name, email, password, role, phone);
    persistSession(
      { _id: data._id, name: data.name, email: data.email, role: data.role },
      data.token
    );
    return data;
  };

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
