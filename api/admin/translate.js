// /api/admin/translate.js
// Machine-translated drafts for the editor. Nothing is saved: the editor
// shows the drafts, and someone reviews them and saves.
// Needs the admin session.
//
//   POST { lang, keys: ["ask_name", ...] }
//     -> { translations: [{ key, text, missingPlaceholders }] }

import { requireAdmin } from "../../lib/admin-auth.js";
import { ENGLISH_ONLY_KEYS, missingPlaceholders } from "../../lib/prompts.js";
import { db, eq } from "../../lib/supabase.js";
import { translate } from "../../lib/translate.js";

const MAX_KEYS = 200;

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Use POST." });
    return;
  }
  try {
    await draft(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function draft(req, res) {
  const { lang, keys } = req.body || {};
  if (typeof lang !== "string" || lang === "en") {
    res.status(400).json({ error: "Pick a language other than English." });
    return;
  }
  if (!Array.isArray(keys) || !keys.length || keys.length > MAX_KEYS || !keys.every((k) => /^\w+$/.test(k))) {
    res.status(400).json({ error: `Send \`keys\`: a list of 1 to ${MAX_KEYS} prompt keys.` });
    return;
  }

  const [language] = await db(`btw_languages?code=${eq(lang)}&select=code`);
  if (!language) {
    res.status(404).json({ error: "No such language." });
    return;
  }

  const wanted = keys.filter((k) => !ENGLISH_ONLY_KEYS.has(k));
  if (!wanted.length) {
    res.status(200).json({ translations: [] });
    return;
  }
  const inList = encodeURIComponent(`(${wanted.join(",")})`);
  const [english, keyRows] = await Promise.all([
    db(`btw_prompts?lang=eq.en&key=in.${inList}&select=key,text`),
    db(`btw_prompt_keys?key=in.${inList}&select=key,placeholders`),
  ]);
  const placeholders = Object.fromEntries(keyRows.map((k) => [k.key, k.placeholders]));

  const texts = await translate(english.map((p) => p.text), lang);
  const translations = english.map((p, i) => ({
    key: p.key,
    text: texts[i],
    missingPlaceholders: missingPlaceholders(texts[i], placeholders[p.key]),
  }));
  res.status(200).json({ translations });
}
