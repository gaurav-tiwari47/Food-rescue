// src/components/ProtectedRoute.jsx
// PURPOSE: Wraps private routes. Redirects to /login if no auth token.
// CONNECTS TO: App.jsx (wraps /dashboard, /add-food routes)

import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import Loader from "./Loader";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Wait for localStorage restore before deciding
  if (loading) return <Loader text="Checking session..." />;

  // Redirect to login, preserving the intended destination
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
