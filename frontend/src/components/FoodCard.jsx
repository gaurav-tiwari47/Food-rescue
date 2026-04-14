// src/components/FoodCard.jsx
// PURPOSE: Reusable card displaying a single food listing.
// CHANGE: Complete rewrite of action buttons to support the new reservation workflow:
//         - "Request Food" button (replaces old Claim Food)
//         - Live 30-minute pickup countdown timer when status=pending
//         - "Confirm Pickup" button for donor on pending listings
//         - "Cancel" button for both donor and requester on pending listings
//         - Status badge reflects all 5 states with correct colours
//         - Translation toggle (EN/HI) preserved from v2
// CONNECTS TO: Home.jsx, Dashboard.jsx, foodApi.js, aiApi.js, useCountdown.js

import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useCountdown from "../hooks/useCountdown";
import {
  requestFoodListing,
  confirmPickup,
  cancelReservation,
} from "../api/foodApi";
import { translateText } from "../api/aiApi";
import { formatDate, timeUntilExpiry, isExpired } from "../utils/formatDate";

const CATEGORY_EMOJI = {
  cooked: "🍲",
  raw: "🥦",
  packaged: "📦",
  beverages: "🧃",
  bakery: "🍞",
  other: "🍱",
};

// ── Status badge component ────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const config = {
    available:  { label: "🟢 Available",   cls: "badge-available" },
    pending:    { label: "🟡 Reserved",    cls: "badge-pending" },
    picked_up:  { label: "🔵 Picked Up",   cls: "badge-picked-up" },
    cancelled:  { label: "⚫ Cancelled",   cls: "badge-cancelled" },
    expired:    { label: "🔴 Expired",     cls: "badge-expired" },
  };
  const { label, cls } = config[status] || config.available;
  return <span className={cls}>{label}</span>;
};

// ── Countdown timer badge ─────────────────────────────────────────────────────
const CountdownBadge = ({ expiresAt, onExpired }) => {
  const { label, isExpired: timerExpired, secondsLeft } = useCountdown(expiresAt);

  // Notify parent when timer hits zero so it can refresh state
  if (timerExpired && onExpired) {
    onExpired();
  }

  const urgency =
    secondsLeft < 120   // under 2 minutes
      ? "bg-red-100 text-red-700 border-red-200"
      : secondsLeft < 600 // under 10 minutes
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-yellow-50 text-yellow-700 border-yellow-200";

  if (timerExpired) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600 border border-red-200">
        ⏰ Reservation expired
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${urgency}`}>
      ⏱ {label}
    </span>
  );
};

// ── Main FoodCard ─────────────────────────────────────────────────────────────
const FoodCard = ({
  food: initialFood,
  onStatusChange,  // Callback: (id, updatedFood) → parent updates local state
  onDeleted,
  showActions = true,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Local food state so the card updates instantly on action (optimistic UI)
  const [food, setFood] = useState(initialFood);
  const [actionLoading, setActionLoading] = useState("");  // "request"|"complete"|"cancel"|""
  const [actionError, setActionError] = useState("");

  // Translation state (preserved from v2)
  const [translating, setTranslating] = useState(false);
  const [lang, setLang] = useState("english");
  const [translatedTitle, setTranslatedTitle] = useState("");
  const [translatedDesc, setTranslatedDesc] = useState("");

  const foodExpired  = isExpired(food.expiryTime);
  const isOwner      = user && (food.createdBy?._id === user._id || food.createdBy === user._id);
  const isRequester  = user && food.claimedBy &&
                       (food.claimedBy?._id === user._id || food.claimedBy === user._id);
  const timeLeft     = timeUntilExpiry(food.expiryTime);
  const canEdit      = isOwner && food.status === "available";

  const updateLocalFood = (updatedFood) => {
    setFood(updatedFood);
    if (onStatusChange) onStatusChange(updatedFood._id, updatedFood);
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleRequest = async () => {
    if (!user) { navigate("/login"); return; }
    setActionLoading("request");
    setActionError("");
    try {
      const updated = await requestFoodListing(food._id);
      updateLocalFood(updated);
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to request food");
    } finally {
      setActionLoading("");
    }
  };

  const handleComplete = async () => {
    setActionLoading("complete");
    setActionError("");
    try {
      const updated = await confirmPickup(food._id);
      updateLocalFood(updated);
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to confirm pickup");
    } finally {
      setActionLoading("");
    }
  };

  const handleCancel = async () => {
    setActionLoading("cancel");
    setActionError("");
    try {
      const updated = await cancelReservation(food._id);
      updateLocalFood(updated);
    } catch (err) {
      setActionError(err.response?.data?.message || "Failed to cancel reservation");
    } finally {
      setActionLoading("");
    }
  };

  // When countdown hits 0, refresh local status to available
  const handleTimerExpired = useCallback(() => {
    if (food.status === "pending") {
      setFood((prev) => ({
        ...prev,
        status: "available",
        claimedBy: null,
        claimRequestedAt: null,
        claimExpiresAt: null,
      }));
    }
  }, [food.status]);

  // ── Translation ────────────────────────────────────────────────────────────
  const handleTranslate = useCallback(async (targetLang) => {
    if (targetLang === "english") {
      setLang("english");
      setTranslatedTitle("");
      setTranslatedDesc("");
      return;
    }
    setTranslating(true);
    try {
      const combinedText = `TITLE: ${food.title}\nDESCRIPTION: ${food.description}`;
      const translated = await translateText(combinedText, targetLang);
      const titleMatch = translated.match(/TITLE:\s*(.+)/);
      const descMatch  = translated.match(/DESCRIPTION:\s*([\s\S]+)/);
      setTranslatedTitle(titleMatch?.[1]?.trim() || food.title);
      setTranslatedDesc(descMatch?.[1]?.trim()  || food.description);
      setLang(targetLang);
    } catch {
      // Silent fail — fall back to English
    } finally {
      setTranslating(false);
    }
  }, [food.title, food.description]);

  const displayTitle = lang === "hindi" && translatedTitle ? translatedTitle : food.title;
  const displayDesc  = lang === "hindi" && translatedDesc  ? translatedDesc  : food.description;

  const timeLeftColor = () => {
    if (foodExpired || ["picked_up", "cancelled", "expired"].includes(food.status))
      return "text-stone-400";
    if (timeLeft.includes("d")) return "text-brand-600";
    const h = parseInt(timeLeft);
    if (!isNaN(h) && h <= 2) return "text-red-500 font-semibold";
    return "text-warm-600";
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="card flex flex-col animate-slide-up">
      {/* ── Image / Banner ──────────────────────────────────────────────── */}
      <div className="relative h-40 bg-gradient-to-br from-brand-50 to-warm-50 flex items-center justify-center overflow-hidden">
        {food.imageUrl ? (
          <img src={food.imageUrl} alt={food.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-6xl opacity-60">{CATEGORY_EMOJI[food.category] || "🍱"}</span>
        )}

        {/* Status badge */}
        <div className="absolute top-3 right-3">
          <StatusBadge status={food.status} />
        </div>

        {/* Category chip */}
        <div className="absolute top-3 left-3">
          <span className="bg-white/80 backdrop-blur-sm text-xs font-medium text-stone-600 px-2 py-1 rounded-lg capitalize">
            {food.category}
          </span>
        </div>

        {/* Language toggle */}
        <div className="absolute bottom-2 right-2 flex gap-1">
          {["english", "hindi"].map((l) => (
            <button
              key={l}
              onClick={() => handleTranslate(l)}
              disabled={translating}
              className={`text-xs px-2 py-0.5 rounded-md font-medium transition-all ${
                lang === l ? "bg-brand-600 text-white" : "bg-white/80 text-stone-600 hover:bg-white"
              }`}
            >
              {l === "english" ? "EN" : "हि"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        <h3 className="font-display text-lg font-semibold text-stone-800 leading-tight line-clamp-1">
          {displayTitle}
        </h3>
        <p className="text-sm text-stone-500 line-clamp-2 leading-relaxed">{displayDesc}</p>

        {/* Pickup countdown — shown when pending */}
        {food.status === "pending" && food.claimExpiresAt && (
          <div className="mt-1">
            <CountdownBadge
              expiresAt={food.claimExpiresAt}
              onExpired={handleTimerExpired}
            />
            {food.claimedBy?.name && (
              <p className="text-xs text-stone-400 mt-1">
                Reserved by: {food.claimedBy.name}
              </p>
            )}
          </div>
        )}

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-2 mt-1">
          <div className="bg-stone-50 rounded-lg px-3 py-2">
            <p className="text-xs text-stone-400 mb-0.5">Quantity</p>
            <p className="text-sm font-medium text-stone-700">{food.quantity}</p>
          </div>
          <div className="bg-stone-50 rounded-lg px-3 py-2">
            <p className="text-xs text-stone-400 mb-0.5">Food expires</p>
            <p className={`text-sm font-medium ${timeLeftColor()}`}>{timeLeft || "—"}</p>
          </div>
        </div>

        <div className="flex items-start gap-1.5 text-sm text-stone-500">
          <span className="mt-0.5">📍</span>
          <span className="line-clamp-1">{food.pickupAddress}</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-stone-500">
          <span>📞</span>
          <span>{food.contactNumber}</span>
        </div>
        {food.createdBy?.name && (
          <div className="flex items-center gap-1.5 text-sm text-stone-500">
            <span>👤</span>
            <span>{food.createdBy.name}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-stone-400 mt-1">
          <span>🕐</span>
          <span>Food expires: {formatDate(food.expiryTime)}</span>
        </div>
        {food.pickedUpAt && (
          <div className="flex items-center gap-1.5 text-xs text-blue-500 mt-0.5">
            <span>✅</span>
            <span>Picked up: {formatDate(food.pickedUpAt)}</span>
          </div>
        )}

        {/* Action error */}
        {actionError && (
          <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg mt-1">
            ⚠️ {actionError}
          </p>
        )}

        {/* ── Action Buttons ─────────────────────────────────────────────── */}
        {showActions && (
          <div className="mt-auto pt-3 border-t border-stone-100">
            {/* ── NON-OWNER ACTIONS ───────────────────────────────────── */}
            {!isOwner && (
              <div className="flex gap-2">
                {/* Request Food button — only on available listings */}
                {food.status === "available" && (
                  <button
                    onClick={handleRequest}
                    disabled={actionLoading === "request"}
                    className="btn-primary text-sm py-2 flex-1"
                  >
                    {actionLoading === "request" ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Requesting...
                      </span>
                    ) : (
                      "🙋 Request Food"
                    )}
                  </button>
                )}

                {/* Requester can cancel their own pending request */}
                {food.status === "pending" && isRequester && (
                  <button
                    onClick={handleCancel}
                    disabled={actionLoading === "cancel"}
                    className="btn-secondary text-sm py-2 flex-1 border-amber-200 text-amber-700 hover:bg-amber-50"
                  >
                    {actionLoading === "cancel" ? "Cancelling..." : "✖ Cancel Request"}
                  </button>
                )}

                {/* Info messages */}
                {food.status === "pending" && !isRequester && (
                  <div className="flex-1 text-center text-sm text-amber-600 bg-amber-50 rounded-xl py-2 px-3">
                    🕐 Reserved — check back in 30m
                  </div>
                )}
                {["picked_up", "cancelled", "expired"].includes(food.status) && (
                  <div className="flex-1 text-center text-sm text-stone-400 py-2">
                    {food.status === "picked_up" && "✅ Successfully picked up"}
                    {food.status === "cancelled"  && "⚫ This listing was cancelled"}
                    {food.status === "expired"    && "🔴 Listing has expired"}
                  </div>
                )}
              </div>
            )}

            {/* ── OWNER (DONOR) ACTIONS ────────────────────────────────── */}
            {isOwner && (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  {/* Edit — only on available listings */}
                  {canEdit && (
                    <Link
                      to={`/edit-food/${food._id}`}
                      className="btn-secondary text-sm py-2 flex-1 text-center"
                    >
                      ✏️ Edit
                    </Link>
                  )}

                  {/* Confirm Pickup — only on pending listings */}
                  {food.status === "pending" && (
                    <button
                      onClick={handleComplete}
                      disabled={actionLoading === "complete"}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm py-2 px-4 rounded-xl transition-all active:scale-95 flex-1"
                    >
                      {actionLoading === "complete" ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Confirming...
                        </span>
                      ) : (
                        "✅ Confirm Pickup"
                      )}
                    </button>
                  )}

                  {/* Cancel pending reservation — donor can also cancel */}
                  {food.status === "pending" && (
                    <button
                      onClick={handleCancel}
                      disabled={actionLoading === "cancel"}
                      className="btn-danger text-sm py-2 px-3"
                      title="Cancel this reservation"
                    >
                      {actionLoading === "cancel" ? "..." : "✖"}
                    </button>
                  )}

                  {/* Delete listing */}
                  {onDeleted && food.status !== "pending" && (
                    <button
                      onClick={() => onDeleted(food._id)}
                      className="btn-danger text-sm py-2 flex-1"
                    >
                      🗑 Delete
                    </button>
                  )}
                </div>

                {/* Donor context info */}
                {food.status === "picked_up" && (
                  <p className="text-xs text-center text-blue-600">
                    ✅ Food was successfully collected
                  </p>
                )}
                {food.status === "pending" && (
                  <p className="text-xs text-center text-amber-600">
                    Requester has 30 minutes to pick up. Confirm when they arrive.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodCard;
