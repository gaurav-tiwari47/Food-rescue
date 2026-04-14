// src/App.jsx
// PURPOSE: Root component. Defines all routes and wraps them in shared layout.
// CHANGE: Added /edit-food/:id protected route for the new EditFood page.
// CONNECTS TO: All pages, Navbar, ProtectedRoute, AuthContext

import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AddFood from "./pages/AddFood";
import EditFood from "./pages/EditFood";       // NEW: Edit listing page
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

const App = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar appears on every page */}
      <Navbar />

      {/* Main content area grows to fill remaining height */}
      <main className="flex-1">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes — require valid JWT */}
          <Route
            path="/add-food"
            element={
              <ProtectedRoute>
                <AddFood />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-food/:id"             // NEW: :id is the food listing's MongoDB _id
            element={
              <ProtectedRoute>
                <EditFood />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch-all 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-stone-100 py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-stone-400">
          <div className="flex items-center gap-2">
            <span className="text-lg">🥗</span>
            <span>
              <strong className="text-stone-600">FoodRescue</strong> — Fighting food waste together
            </span>
          </div>
          <p>© {new Date().getFullYear()} FoodRescue App. Built with ❤️ for SDG 2.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
