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
// Thinking-only models (e.g. some gemini-2.5-pro builds) reject thinkingBudget: 0.
// Use a generous maxOutputTokens so reasoning + visible text fit; aggregate all
// non-thought parts in extractGeminiText.

const geminiModel = () => process.env.GEMINI_MODEL || "gemini-2.5-pro";

const geminiGenerationConfig = () => ({
  temperature: 0.7,
  maxOutputTokens: 4096,
});

const extractGeminiText = (data) => {
  let out = "";
  for (const candidate of data.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.thought === true) continue;
      if (typeof part.text === "string" && part.text.length) {
        out += part.text;
      }
    }
  }
  return out.trim();
};

const callGemini = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in .env");

  const model = geminiModel();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: geminiGenerationConfig(),
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errBody}`);
  }

  const data = await res.json();
  const blockReason = data.promptFeedback?.blockReason;
  if (blockReason) {
    throw new Error(`Gemini blocked the request: ${blockReason}`);
  }

  return extractGeminiText(data);
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

    const prompt = `You are an enthusiastic food donor writing an appealing listing for a community food rescue app.
Generate a warm, descriptive, and appetizing food donation description (aim for 4 to 6 sentences).

Details provided by the donor:
Food title: ${title}
Quantity: ${quantity}
Category: ${category}

Instructions for the description:
1.⁠ ⁠Be Descriptive: Use your culinary knowledge to expand on the "${title}". Add appealing, sensory details about its flavor, freshness, or comforting qualities, even if the title is very basic.
2.⁠ ⁠Include Details: Mention the exact quantity (${quantity}) and category naturally in the flow of the text.
3.⁠ ⁠Reassure the Receiver: Note that the food is safely packaged/prepared and in excellent condition for immediate pickup.
4.⁠ ⁠Call to Action: Sound friendly and warmly encourage the community to claim it quickly.
5.⁠ ⁠Formatting Constraints: Output STRICTLY as a single paragraph of plain text. Do NOT use any markdown, bullet points, asterisks, bold text, or special characters.

Write only the description paragraph, nothing else.`;

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
