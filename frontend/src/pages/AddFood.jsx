// src/pages/AddFood.jsx
// PURPOSE: Form for creating a new food listing.
// CHANGE: Added AI description generator, AI category detector, and form validation.
// CONNECTS TO: foodApi.js (createFoodListing), aiApi.js, React Router

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { createFoodListing } from "../api/foodApi";
import { generateDescription, detectCategory } from "../api/aiApi";
import { getUserLocation } from "../utils/getDistance";

const CATEGORIES = ["cooked", "raw", "packaged", "beverages", "bakery", "other"];

const initialForm = {
  title: "",
  description: "",
  quantity: "",
  category: "cooked",
  expiryTime: "",
  pickupAddress: "",
  contactNumber: "",
  imageUrl: "",
  latitude: "",
  longitude: "",
};

// Reusable AI button component used in this file
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

const AddFood = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  // AI state
  const [aiDescLoading, setAiDescLoading] = useState(false);
  const [aiCatLoading, setAiCatLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuccess, setAiSuccess] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
    setAiError("");
    setAiSuccess("");
  };

  const handleGetLocation = async () => {
    setGeoLoading(true);
    try {
      const { lat, lng } = await getUserLocation();
      setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    } catch {
      setError("Could not get location. Please enter coordinates manually.");
    } finally {
      setGeoLoading(false);
    }
  };

  // ── AI: Generate Description ─────────────────────────────────────────
  const handleGenerateDescription = async () => {
    if (!form.title.trim()) {
      setAiError("Please enter a food title first.");
      return;
    }
    if (!form.quantity.trim()) {
      setAiError("Please enter a quantity first.");
      return;
    }

    setAiDescLoading(true);
    setAiError("");
    setAiSuccess("");
    try {
      const description = await generateDescription({
        title: form.title,
        quantity: form.quantity,
        category: form.category,
      });
      setForm((prev) => ({ ...prev, description }));
      setAiSuccess("✨ Description generated! Feel free to edit it.");
    } catch (err) {
      setAiError(err.response?.data?.message || "AI generation failed. Check your API key.");
    } finally {
      setAiDescLoading(false);
    }
  };

  // ── AI: Detect Category ──────────────────────────────────────────────
  const handleDetectCategory = async () => {
    if (!form.title.trim()) {
      setAiError("Please enter a food title first.");
      return;
    }

    setAiCatLoading(true);
    setAiError("");
    setAiSuccess("");
    try {
      const category = await detectCategory(form.title);
      setForm((prev) => ({ ...prev, category }));
      setAiSuccess(`✨ Category auto-detected: "${category}"`);
    } catch (err) {
      setAiError(err.response?.data?.message || "Category detection failed.");
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
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    try {
      await createFoodListing(form);
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create listing. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const minDateTime = new Date().toISOString().slice(0, 16);

  return (
    <div className="min-h-screen bg-stone-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-brand-700 mb-6 transition-colors">
          ← Back to listings
        </Link>

        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8 animate-slide-up">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold text-stone-800">🍱 Donate Food</h1>
            <p className="text-stone-500 mt-2 text-sm">
              Fill in the details below. Use the ✨ AI buttons for instant help.
            </p>
          </div>

          {/* Success */}
          {success && (
            <div className="bg-brand-50 border border-brand-200 text-brand-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2">
              ✅ Listing created! Redirecting to dashboard...
            </div>
          )}

          {/* Form error */}
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
              ⚠️ {error}
            </div>
          )}

          {/* AI feedback */}
          {aiError && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
              🤖 {aiError}
            </div>
          )}
          {aiSuccess && (
            <div className="bg-violet-50 border border-violet-200 text-violet-700 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
              {aiSuccess}
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

            {/* Description with AI generator */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Description *</label>
                <AIButton
                  onClick={handleGenerateDescription}
                  loading={aiDescLoading}
                  disabled={!form.title || !form.quantity}
                >
                  Generate with AI
                </AIButton>
              </div>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="input resize-none"
                rows={4}
                placeholder="Describe the food — or click ✨ Generate with AI after filling title & quantity"
                maxLength={500}
              />
              <p className="text-xs text-stone-400 mt-1">{form.description.length}/500</p>
            </div>

            {/* Quantity + Category with AI detect */}
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
              <p className="text-xs text-stone-400 mt-1">When does the food need to be picked up by?</p>
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
                Coordinates <span className="text-stone-400 font-normal">(optional — for map view)</span>
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
              <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button type="submit" disabled={loading || success} className="btn-primary flex-1 py-3">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Publishing...
                  </span>
                ) : (
                  "🍱 Publish Listing"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddFood;
