// src/controllers/aiController.js
// PURPOSE: Handles all AI-powered features: description generation,
//          category detection, and translation.
// CONNECTS TO: aiRoutes.js → called from AddFood.jsx and FoodCard.jsx
//
// SUPPORTS TWO PROVIDERS (set AI_PROVIDER in .env):
//   "gemini"  → Google Gemini API (free tier available)
//   "openai"  → OpenAI GPT-4o-mini

// ── Provider abstraction ────────────────────────────────────────────────────
// Sends a plain text prompt to whichever AI provider is configured.
// Returns the AI's response as a plain string.

const callAI = async (prompt) => {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();

  if (provider === "gemini") {
    return await callGemini(prompt);
  } else if (provider === "openai") {
    return await callOpenAI(prompt);
  } else {
    throw new Error(`Unknown AI_PROVIDER: "${provider}". Use "gemini" or "openai".`);
  }
};

// ── Gemini implementation ───────────────────────────────────────────────────
const callGemini = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in .env");

  // Use the REST API directly so we don't need a heavyweight SDK
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 300,
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  // Navigate Gemini's nested response structure
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
};

// ── OpenAI implementation ───────────────────────────────────────────────────
const callOpenAI = async (prompt) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set in .env");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || "";
};

// ── Controller: Generate Description ───────────────────────────────────────
// @desc    Generate a polished food donation description using AI
// @route   POST /api/ai/generate-description
// @access  Private (logged-in donors)
const generateDescription = async (req, res, next) => {
  try {
    const { title, quantity, category } = req.body;

    if (!title || !quantity || !category) {
      res.status(400);
      throw new Error("Please provide title, quantity, and category");
    }

    const prompt = `You are helping a food donor write a listing for a food rescue app.
Generate a short, clear, and warm food donation description (2-3 sentences, max 120 words).

Details:
- Food title: ${title}
- Quantity: ${quantity}
- Category: ${category}

The description should:
- Mention the food type and quantity naturally
- Note it is freshly prepared/packaged and ready for pickup
- Sound friendly and encourage quick claiming
- NOT include any markdown, bullet points, or special formatting
- Be plain text only

Write only the description, nothing else.`;

    const description = await callAI(prompt);

    if (!description) {
      res.status(502);
      throw new Error("AI returned an empty response. Please try again.");
    }

    res.json({ description });
  } catch (error) {
    next(error);
  }
};

// ── Controller: Detect Category ─────────────────────────────────────────────
// @desc    Auto-detect the most appropriate food category from a title
// @route   POST /api/ai/detect-category
// @access  Private

const detectCategory = async (req, res, next) => {
  try {
    const { title } = req.body;

    if (!title || !title.trim()) {
      res.status(400);
      throw new Error("Please provide a food title");
    }

    const prompt = `You are a food category classifier for a food donation app.
Given the food title below, respond with EXACTLY ONE word from this list:
cooked, raw, packaged, beverages, bakery, other

Rules:
- "cooked" = prepared meals, curries, rice dishes, stews
- "raw" = fresh vegetables, fruits, uncooked meat/fish
- "packaged" = sealed/factory packaged food, canned goods, snacks
- "beverages" = drinks, juices, water, tea, coffee
- "bakery" = bread, cakes, pastries, cookies, muffins
- "other" = anything that doesn't clearly fit above

Food title: "${title}"

Reply with only the single category word, lowercase, no punctuation.`;

    const rawCategory = await callAI(prompt);

    // Sanitize: extract only valid category word
    const valid = ["cooked", "raw", "packaged", "beverages", "bakery", "other"];
    const cleaned = rawCategory.toLowerCase().replace(/[^a-z]/g, "").trim();
    const category = valid.includes(cleaned) ? cleaned : "other";

    res.json({ category });
  } catch (error) {
    next(error);
  }
};

// ── Controller: Translate Text ──────────────────────────────────────────────
// @desc    Translate listing title + description to a target language
// @route   POST /api/ai/translate
// @access  Public (translation helps non-English users browse listings)
const translateText = async (req, res, next) => {
  try {
    const { text, language } = req.body;

    if (!text || !language) {
      res.status(400);
      throw new Error("Please provide text and target language");
    }

    // Allowlist languages to prevent prompt injection
    const supportedLanguages = {
      hindi: "Hindi (Devanagari script)",
      english: "English",
    };

    const targetLang = supportedLanguages[language.toLowerCase()];
    if (!targetLang) {
      res.status(400);
      throw new Error(`Unsupported language. Supported: ${Object.keys(supportedLanguages).join(", ")}`);
    }

    // If already in target, short-circuit
    if (language.toLowerCase() === "english") {
      return res.json({ translatedText: text });
    }

    const prompt = `Translate the following food listing text to ${targetLang}.
Keep the translation natural and friendly.
Preserve any numbers, quantities, and addresses as-is.
Return ONLY the translated text, no explanations.

Text to translate:
${text}`;

    const translatedText = await callAI(prompt);

    if (!translatedText) {
      res.status(502);
      throw new Error("Translation failed. Please try again.");
    }

    res.json({ translatedText });
  } catch (error) {
    next(error);
  }
};

module.exports = { generateDescription, detectCategory, translateText };
