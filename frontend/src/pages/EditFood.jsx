// src/pages/EditFood.jsx
// PURPOSE: NEW PAGE — Edit an existing food listing.
//          Pre-fills form with current values, validates, then calls update API.
// CONNECTS TO: foodApi.js (fetchFoodById, updateFoodListing), aiApi.js, React Router

import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { fetchFoodById, updateFoodListing } from "../api/foodApi";
import { generateDescription, detectCategory } from "../api/aiApi";
import { getUserLocation } from "../utils/getDistance";
import Loader from "../components/Loader";
import useAuth from "../hooks/useAuth";

const CATEGORIES = ["cooked", "raw", "packaged", "beverages", "bakery", "other"];

// Reusable AI button (same pattern as AddFood)
const AIButton = ({ onClick, loading, disabled, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={loading || disabled}
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
      border transition-all duration-200
      ${loading || disabled
        ? "bg-stone-50 text-stone-400 border-stone-200 cursor-not-allowed"
        : "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 hover:border-violet-300 active:scale-95"
      }`}
  >
    {loading ? (
      <span className="w-3 h-3 border-2 border-violet-300 border-t-violet-600 rounded-full animate-spin" />
    ) : (
      <span>✨</span>
    )}
    {loading ? "Generating..." : children}
  </button>
);

// Toast notification component
const Toast = ({ message, type = "success", onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const styles = {
    success: "bg-brand-50 border-brand-200 text-brand-700",
    error: "bg-red-50 border-red-100 text-red-600",
    ai: "bg-violet-50 border-violet-200 text-violet-700",
  };

  const icons = { success: "✅", error: "⚠️", ai: "✨" };

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 border px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-up ${styles[type]}`}>
      {icons[type]} {message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">×</button>
    </div>
  );
};

const EditFood = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState(null);         // null = loading
  const [fetchError, setFetchError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [toast, setToast] = useState(null);        // { message, type }

  // AI state
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiCatLoading, setAiCatLoading] = useState(false);

  // ── Fetch existing listing on mount ─────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchFoodById(id);

        // Authorization check client-side (server also enforces this)
        if (data.createdBy?._id !== user?._id && data.createdBy !== user?._id) {
          setFetchError("You are not authorized to edit this listing.");
          return;
        }

        if (data.status === "claimed") {
          setFetchError("This listing has already been claimed and cannot be edited.");
          return;
        }

        // Format expiryTime for datetime-local input
        const expiryFormatted = data.expiryTime
          ? new Date(data.expiryTime).toISOString().slice(0, 16)
          : "";

        setForm({
          title: data.title || "",
          description: data.description || "",
          quantity: data.quantity || "",
          category: data.category || "other",
          expiryTime: expiryFormatted,
          pickupAddress: data.pickupAddress || "",
          contactNumber: data.contactNumber || "",
          imageUrl: data.imageUrl || "",
          latitude: data.latitude || "",
          longitude: data.longitude || "",
        });
      } catch (err) {
        setFetchError(err.response?.data?.message || "Failed to load listing.");
      }
    };
    if (id && user) load();
  }, [id, user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setSubmitError("");
  };

  const handleGetLocation = async () => {
    setGeoLoading(true);
    try {
      const { lat, lng } = await getUserLocation();
      setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    } catch {
      setToast({ message: "Could not detect location.", type: "error" });
    } finally {
      setGeoLoading(false);
    }
  };

  // ── AI: Regenerate Description ───────────────────────────────────────────
  const handleGenerateDescription = async () => {
    if (!form.title.trim() || !form.quantity.trim()) {
      setToast({ message: "Please fill title and quantity first.", type: "error" });
      return;
    }
    setAiDescLoading(true);
    try {
      const description = await generateDescription({
        title: form.title,
        quantity: form.quantity,
        category: form.category,
      });
      setForm((prev) => ({ ...prev, description }));
      setToast({ message: "Description regenerated with AI!", type: "ai" });
    } catch (err) {
      setToast({ message: err.response?.data?.message || "AI generation failed.", type: "error" });
    } finally {
      setAiDescLoading(false);
    }
  };

  // ── AI: Detect Category ──────────────────────────────────────────────────
  const handleDetectCategory = async () => {
    if (!form.title.trim()) {
      setToast({ message: "Please fill title first.", type: "error" });
      return;
    }
    setAiCatLoading(true);
    try {
      const category = await detectCategory(form.title);
      setForm((prev) => ({ ...prev, category }));
      setToast({ message: `Category detected: "${category}"`, type: "ai" });
    } catch (err) {
      setToast({ message: "Category detection failed.", type: "error" });
    } finally {
      setAiCatLoading(false);
    }
  };

  const validate = () => {
    const required = ["title", "description", "quantity", "expiryTime", "pickupAddress", "contactNumber"];
    for (const field of required) {
      if (!form[field].toString().trim()) {
        return `Please fill in the ${field.replace(/([A-Z])/g, " $1").toLowerCase()} field.`;
      }
    }
    if (new Date(form.expiryTime) <= new Date()) {
      return "Expiry time must be in the future.";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setSubmitError(validationError); return; }

    setLoading(true);
    try {
      await updateFoodListing(id, form);
      setToast({ message: "Listing updated successfully!", type: "success" });
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      setSubmitError(err.response?.data?.message || "Update failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const minDateTime = new Date().toISOString().slice(0, 16);

  // Loading state
  if (!form && !fetchError) return <Loader text="Loading listing..." />;

  // Error state (not owner, already claimed, not found)
  if (fetchError) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🚫</p>
          <h2 className="font-display text-xl font-bold text-stone-800 mb-2">Cannot Edit</h2>
          <p className="text-stone-500 mb-6">{fetchError}</p>
          <Link to="/dashboard" className="btn-primary">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-10 px-4">
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-2xl mx-auto">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-brand-700 mb-6 transition-colors">
          ← Back to Dashboard
        </Link>

        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8 animate-slide-up">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">✏️</span>
              <h1 className="font-display text-3xl font-bold text-stone-800">Edit Listing</h1>
            </div>
            <p className="text-stone-500 text-sm">
              Update your food listing details. AI tools are available to help.
            </p>
          </div>

          {/* Submit Error */}
          {submitError && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
              ⚠️ {submitError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label className="label">Food Title *</label>
              <input
                name="title"
                type="text"
                value={form.title}
                onChange={handleChange}
                className="input"
                placeholder="e.g. Dal Rice for 20 people"
                maxLength={100}
              />
              <p className="text-xs text-stone-400 mt-1">{form.title.length}/100</p>
            </div>

            {/* Description with AI */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Description *</label>
                <AIButton
                  onClick={handleGenerateDescription}
                  loading={aiDescLoading}
                  disabled={!form.title || !form.quantity}
                >
                  Regenerate with AI
                </AIButton>
              </div>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="input resize-none"
                rows={4}
                placeholder="Describe the food..."
                maxLength={500}
              />
              <p className="text-xs text-stone-400 mt-1">{form.description.length}/500</p>
            </div>

            {/* Quantity + Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Quantity *</label>
                <input
                  name="quantity"
                  type="text"
                  value={form.quantity}
                  onChange={handleChange}
                  className="input"
                  placeholder="e.g. 5 kg, 20 plates"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">Category *</label>
                  <AIButton
                    onClick={handleDetectCategory}
                    loading={aiCatLoading}
                    disabled={!form.title}
                  >
                    Detect
                  </AIButton>
                </div>
                <select name="category" value={form.category} onChange={handleChange} className="input">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Expiry Time */}
            <div>
              <label className="label">Expiry / Best Before *</label>
              <input
                name="expiryTime"
                type="datetime-local"
                value={form.expiryTime}
                min={minDateTime}
                onChange={handleChange}
                className="input"
              />
            </div>

            {/* Pickup Address */}
            <div>
              <label className="label">Pickup Address *</label>
              <input
                name="pickupAddress"
                type="text"
                value={form.pickupAddress}
                onChange={handleChange}
                className="input"
                placeholder="Full address for pickup"
              />
            </div>

            {/* Geolocation */}
            <div>
              <label className="label">
                Coordinates <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <div className="flex gap-3">
                <input
                  name="latitude"
                  type="number"
                  value={form.latitude}
                  onChange={handleChange}
                  className="input text-sm"
                  placeholder="Latitude"
                  step="any"
                />
                <input
                  name="longitude"
                  type="number"
                  value={form.longitude}
                  onChange={handleChange}
                  className="input text-sm"
                  placeholder="Longitude"
                  step="any"
                />
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={geoLoading}
                  className="btn-secondary text-sm px-3 whitespace-nowrap"
                >
                  {geoLoading ? "..." : "📍 Detect"}
                </button>
              </div>
            </div>

            {/* Contact */}
            <div>
              <label className="label">Contact Number *</label>
              <input
                name="contactNumber"
                type="tel"
                value={form.contactNumber}
                onChange={handleChange}
                className="input"
                placeholder="+91 98765 43210"
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="label">
                Image URL <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <input
                name="imageUrl"
                type="url"
                value={form.imageUrl}
                onChange={handleChange}
                className="input"
                placeholder="https://example.com/food-photo.jpg"
              />
              {form.imageUrl && (
                <img
                  src={form.imageUrl}
                  alt="Preview"
                  className="mt-2 h-32 w-full object-cover rounded-xl border border-stone-200"
                  onError={(e) => (e.target.style.display = "none")}
                />
              )}
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => navigate("/dashboard")} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 py-3">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </span>
                ) : (
                  "✏️ Save Changes"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditFood;
