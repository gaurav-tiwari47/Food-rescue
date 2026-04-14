// src/components/Navbar.jsx
// PURPOSE: Top navigation bar. Adapts links based on auth state.
// CONNECTS TO: AuthContext (via useAuth), React Router

import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  const navLink = (to, label) => (
    <Link
      to={to}
      onClick={() => setMenuOpen(false)}
      className={`text-sm font-medium transition-colors duration-200 ${
        isActive(to)
          ? "text-brand-700 border-b-2 border-brand-600 pb-0.5"
          : "text-stone-600 hover:text-brand-700"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <span className="text-2xl">🥗</span>
            <span className="font-display text-xl font-bold text-stone-800 group-hover:text-brand-700 transition-colors">
              FoodRescue
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLink("/", "Home")}

            {user ? (
              <>
                {navLink("/dashboard", "Dashboard")}
                {navLink("/add-food", "Donate Food")}
                <div className="flex items-center gap-3 ml-2">
                  <div className="flex items-center gap-2 bg-brand-50 rounded-xl px-3 py-1.5">
                    <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-stone-700">
                      {user.name.split(" ")[0]}
                    </span>
                  </div>
                  <button onClick={handleLogout} className="btn-secondary text-sm py-2 px-4">
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                {navLink("/login", "Login")}
                <Link to="/register" className="btn-primary text-sm py-2">
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-stone-100 py-4 flex flex-col gap-4 animate-fade-in">
            {navLink("/", "Home")}
            {user ? (
              <>
                {navLink("/dashboard", "Dashboard")}
                {navLink("/add-food", "Donate Food")}
                <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-sm text-stone-600">Hi, {user.name.split(" ")[0]}!</span>
                  <button onClick={handleLogout} className="btn-secondary text-sm py-1.5 px-4">
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-3 pt-2 border-t border-stone-100">
                <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-secondary text-sm flex-1 text-center py-2">
                  Login
                </Link>
                <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary text-sm flex-1 text-center py-2">
                  Register
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
