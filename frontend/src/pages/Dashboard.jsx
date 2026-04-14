// src/pages/Dashboard.jsx
// PURPOSE: User dashboard — donor's listings, and requester's food requests.
// CHANGE: Replaced old "Claimed Food" tab with "My Requests" tab (uses fetchMyRequests).
//         Updated stats to show pending reservations count.
//         FoodCard now uses onStatusChange callback instead of onClaimed.
//         Donor sees Confirm Pickup + Cancel on their pending listings.
// CONNECTS TO: foodApi.js, FoodCard.jsx, useAuth.js

import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { fetchMyListings, fetchMyRequests, deleteFoodListing } from "../api/foodApi";
import FoodCard from "../components/FoodCard";
import Loader from "../components/Loader";

const TAB = { MY: "my", REQUESTS: "requests" };

const Dashboard = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState(TAB.MY);
  const [myListings, setMyListings]   = useState([]);
  const [myRequests, setMyRequests]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");
  const [toast, setToast]             = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [mine, requests] = await Promise.all([
          fetchMyListings(),
          fetchMyRequests(),
        ]);
        setMyListings(mine);
        setMyRequests(requests);
      } catch {
        setError("Failed to load your data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    try {
      await deleteFoodListing(id);
      setMyListings((prev) => prev.filter((f) => f._id !== id));
      showToast("Listing deleted.");
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed.");
    }
  };

  // When FoodCard reports a status change (request/complete/cancel),
  // update the relevant list in local state without a full refetch
  const handleStatusChange = useCallback((id, updatedFood) => {
    setMyListings((prev) =>
      prev.map((f) => (f._id === id ? updatedFood : f))
    );
    setMyRequests((prev) =>
      prev.map((f) => (f._id === id ? updatedFood : f))
    );
  }, []);

  const roleLabel = { user: "🏠 Individual", ngo: "🤝 NGO/Volunteer", admin: "🛡 Admin" };

  const pendingDonorCount    = myListings.filter((f) => f.status === "pending").length;
  const activeListingsCount  = myListings.filter((f) => f.status === "available").length;
  const myActiveRequestCount = myRequests.filter((f) => f.status === "pending").length;

  const stats = [
    { label: "My Listings",      value: myListings.length,     icon: "🍱" },
    { label: "Pending Pickups",  value: pendingDonorCount,     icon: "🟡", highlight: pendingDonorCount > 0 },
    { label: "My Requests",      value: myActiveRequestCount,  icon: "🙋" },
  ];

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-brand-50 border border-brand-200 text-brand-700 px-4 py-3 rounded-xl shadow text-sm font-medium animate-fade-in">
          ✅ {toast}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* ── Profile Header ─────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-brand-700 to-brand-500 rounded-3xl p-6 sm:p-8 text-white mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold">{user?.name}</h1>
              <p className="text-brand-100 text-sm mt-0.5">{user?.email}</p>
              <span className="inline-block mt-2 bg-white/20 text-xs font-medium px-3 py-1 rounded-full">
                {roleLabel[user?.role] || user?.role}
              </span>
            </div>
          </div>
          <Link
            to="/add-food"
            className="bg-white text-brand-700 font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-50 transition-colors text-sm shadow-sm"
          >
            + Donate Food
          </Link>
        </div>

        {/* ── Stats ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {stats.map((s) => (
            <div
              key={s.label}
              className={`card p-5 text-center ${s.highlight ? "ring-2 ring-yellow-300" : ""}`}
            >
              <p className="text-3xl mb-1">{s.icon}</p>
              <p className="text-2xl font-bold text-stone-800">{s.value}</p>
              <p className="text-xs text-stone-500 mt-0.5">{s.label}</p>
              {s.highlight && (
                <p className="text-xs text-yellow-600 font-medium mt-1">Action needed!</p>
              )}
            </div>
          ))}
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit mb-8">
          {[
            { key: TAB.MY,       label: `My Listings (${myListings.length})` },
            { key: TAB.REQUESTS, label: `My Requests (${myRequests.length})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-white text-brand-700 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Content ────────────────────────────────────────────────── */}
        {loading ? (
          <Loader text="Loading your data..." />
        ) : error ? (
          <div className="text-center py-12 text-red-500">⚠️ {error}</div>
        ) : (
          <>
            {/* MY LISTINGS (donor view) */}
            {tab === TAB.MY && (
              <div>
                {/* Pending pickups callout */}
                {pendingDonorCount > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
                    <span className="text-2xl">🟡</span>
                    <div>
                      <p className="font-semibold text-yellow-800">
                        {pendingDonorCount} listing{pendingDonorCount > 1 ? "s" : ""} awaiting pickup confirmation
                      </p>
                      <p className="text-sm text-yellow-700">
                        Click "Confirm Pickup" when the requester arrives. Auto-cancels in 30 minutes.
                      </p>
                    </div>
                  </div>
                )}

                {myListings.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-5xl mb-4">🍽️</p>
                    <h3 className="font-display text-xl font-semibold text-stone-700 mb-2">No listings yet</h3>
                    <p className="text-stone-500 mb-6">Start by donating surplus food to those in need.</p>
                    <Link to="/add-food" className="btn-primary">+ Create First Listing</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myListings.map((food) => (
                      <FoodCard
                        key={food._id}
                        food={food}
                        onStatusChange={handleStatusChange}
                        onDeleted={handleDelete}
                        showActions={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* MY REQUESTS (requester view) */}
            {tab === TAB.REQUESTS && (
              <div>
                {myActiveRequestCount > 0 && (
                  <div className="bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
                    <span className="text-2xl">⏱</span>
                    <div>
                      <p className="font-semibold text-brand-800">
                        You have {myActiveRequestCount} active reservation{myActiveRequestCount > 1 ? "s" : ""}
                      </p>
                      <p className="text-sm text-brand-700">
                        Head to the pickup location before the timer expires. Only 1 active request allowed at a time.
                      </p>
                    </div>
                  </div>
                )}

                {myRequests.length === 0 ? (
                  <div className="text-center py-20">
                    <p className="text-5xl mb-4">🤝</p>
                    <h3 className="font-display text-xl font-semibold text-stone-700 mb-2">No requests yet</h3>
                    <p className="text-stone-500 mb-6">Browse available food and request what you need.</p>
                    <Link to="/" className="btn-primary">Browse Listings</Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myRequests.map((food) => (
                      <FoodCard
                        key={food._id}
                        food={food}
                        onStatusChange={handleStatusChange}
                        showActions={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
