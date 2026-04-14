// src/pages/NotFound.jsx
// PURPOSE: 404 fallback page for unmatched routes.

import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md animate-fade-in">
        <p className="text-8xl mb-6">🍽️</p>
        <h1 className="font-display text-5xl font-bold text-stone-800 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-stone-600 mb-3">Page not found</h2>
        <p className="text-stone-500 mb-8 leading-relaxed">
          Looks like this page has already been claimed — or it never existed.
          Let's get you back to rescuing food!
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/" className="btn-primary">
            ← Back to Home
          </Link>
          <Link to="/dashboard" className="btn-secondary">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
