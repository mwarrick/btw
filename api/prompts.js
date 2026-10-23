// /api/prompts.js
// The text of the signup, for the demo page: every prompt in English and in
// each switched-on language, plus those languages in menu order. Public on
// purpose; it's the same text churches receive by SMS.
//
//   GET -> { languages: [{ code, name, menu_label }], prompts: { en: { key: text }, ... } }
//
// Cached at Vercel's edge for 15 seconds, so an edit at /admin shows up in
// the demo within about that long.

import { loadPrompts } from "../lib/prompts.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Use GET." });
    return;
  }

  try {
    const { languages, prompts } = await loadPrompts();
    res.setHeader("Cache-Control", "public, s-maxage=15, stale-while-revalidate=60");
    res.status(200).json({ languages, prompts });
  } catch (err) {
    console.error("prompts:", err.message);
    res.status(500).json({ error: "Couldn't load the prompts." });
  }
}
