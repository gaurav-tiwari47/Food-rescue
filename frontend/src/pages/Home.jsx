// src/pages/Home.jsx
// PURPOSE: Landing page showing all available food listings.
// CHANGE: Replaced handleClaimed (old instant-claim callback) with handleStatusChange
//         (new workflow callback). Updated "How It Works" steps to reflect
//         the new Request → Pickup → Confirm flow.
// CONNECTS TO: foodApi.js, FoodCard.jsx

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { fetchAllFood } from "../api/foodApi";
import FoodCard from "../components/FoodCard";
import Loader from "../components/Loader";
import useAuth from "../hooks/useAuth";

const CATEGORIES = ["all", "cooked", "raw", "packaged", "beverages", "bakery", "other"];

const Home = () => {
  const { user } = useAuth();
  const [foods, setFoods]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [category, setCategory] = useState("all");
  const [search, setSearch]   = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = { status: "available" };
        if (category !== "all") params.category = category;
        const data = await fetchAllFood(params);
        setFoods(data);
      } catch {
        setError("Failed to load listings. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [category]);

  const filtered = foods.filter((f) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      f.title.toLowerCase().includes(q) ||
      f.pickupAddress.toLowerCase().includes(q) ||
      f.description.toLowerCase().includes(q)
    );
  });

  // When a card's status changes (e.g. requested → pending),
  // update it in local state so the card re-renders immediately
  const handleStatusChange = useCallback((id, updatedFood) => {
    setFoods((prev) => prev.map((f) => (f._id === id ? updatedFood : f)));
  }, []);

  return (
    <div className="min-h-screen">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-brand-700 via-brand-600 to-warm-500 text-white overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/3" />

        <div className="relative max-w-6xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium mb-6">
            <span>🌍</span> Fighting food waste, one meal at a time
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold leading-tight mb-6">
            Rescue Food.
            <br />
            <span className="text-warm-200">Feed Lives.</span>
          </h1>
          <p className="text-lg text-brand-100 max-w-xl mx-auto mb-10 leading-relaxed">
            Connect surplus food from restaurants, events, and homes with NGOs
            and people who need it most — before it goes to waste.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {!user ? (
              <>
                <Link to="/register" className="bg-white text-brand-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-brand-50 transition-colors shadow-lg">
                  Join Free →
                </Link>
                <Link to="/login" className="border border-white/40 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-colors">
                  Login
                </Link>
              </>
            ) : (
              <Link to="/add-food" className="bg-white text-brand-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-brand-50 transition-colors shadow-lg">
                + Donate Food
              </Link>
            )}
          </div>
        </div>

        <div className="relative bg-black/20 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto px-6 py-4 grid grid-cols-3 gap-4 text-center">
            {[
              { label: "Available Now", value: "🍱 " + foods.length },
              { label: "Zero Hunger Goal", value: "🎯 SDG 2" },
              { label: "100% Free", value: "✅ Always" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-lg font-bold text-white">{s.value}</p>
                <p className="text-xs text-brand-200">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Listings Section ──────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-stone-800">
              Available Food
            </h2>
            <p className="text-stone-500 mt-1 text-sm">
              {filtered.length} listing{filtered.length !== 1 ? "s" : ""} ready to request
            </p>
          </div>
          <div className="relative max-w-xs w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">🔍</span>
            <input
              type="text"
              placeholder="Search food or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-sm"
            />
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 capitalize ${
                category === cat
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-white text-stone-600 border border-stone-200 hover:border-brand-400 hover:text-brand-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <Loader text="Fetching available food..." />
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-500 text-lg mb-4">⚠️ {error}</p>
            <button onClick={() => setCategory(category)} className="btn-secondary">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🍽️</p>
            <h3 className="font-display text-xl font-semibold text-stone-700 mb-2">No listings found</h3>
            <p className="text-stone-500 mb-6">
              {search ? "Try a different search term." : "Be the first to donate food in your area!"}
            </p>
            {user && <Link to="/add-food" className="btn-primary">+ Add a Listing</Link>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((food) => (
              <FoodCard
                key={food._id}
                food={food}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <section className="bg-stone-100 py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-display text-3xl font-bold text-stone-800 mb-10">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            {[
              { icon: "🏪", title: "Donor Lists Food",    desc: "Restaurants, homes and events post surplus food before it goes to waste." },
              { icon: "🙋", title: "Requester Reserves",  desc: "NGO or volunteer clicks 'Request Food' — a 30-minute pickup window opens." },
              { icon: "🚶", title: "Head to Location",    desc: "Requester goes to the pickup address within the 30-minute timer." },
              { icon: "✅", title: "Donor Confirms",      desc: "Donor taps 'Confirm Pickup' when the food is collected. Done!" },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-3">
                  {item.icon}
                </div>
                <h3 className="font-semibold text-stone-800 mb-1.5 text-sm">{item.title}</h3>
                <p className="text-xs text-stone-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
