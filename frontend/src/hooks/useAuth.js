// src/hooks/useAuth.js
// PURPOSE: Convenience hook to consume AuthContext anywhere in the app.
//          Throws if used outside AuthProvider (developer safety net).
// USAGE:   const { user, login, logout } = useAuth();

import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

export default useAuth;
