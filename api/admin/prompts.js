// /api/admin/prompts.js
// Reads and saves prompt text for the editor. Needs the admin session.
//
//   GET                     -> { languages, keys, prompts, englishOnly }
//   PUT { key, lang, text } -> saves one prompt and returns it
//
// Empty text removes a translation, which the SMS handler then replaces
// with English. That isn't allowed for English itself, or for a language
// that is switched on.

import { requireAdmin } from "../../lib/admin-auth.js";
import { ENGLISH_ONLY_KEYS, missingPlaceholders, straighten } from "../../lib/prompts.js";
import { db, eq } from "../../lib/supabase.js";

const MAX_LENGTH = 1000;

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  try {
    if (req.method === "GET") return await list(res);
    if (req.method === "PUT") return await save(req, res);
    res.setHeader("Allow", "GET, PUT");
    res.status(405).json({ error: "Use GET or PUT." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function list(res) {
  const [languages, keys, prompts] = await Promise.all([
    db("btw_languages?select=*&order=menu_order"),
    db("btw_prompt_keys?select=*&order=sort_order"),
    db("btw_prompts?select=key,lang,text,updated_at"),
  ]);
  res.status(200).json({ languages, keys, prompts, englishOnly: [...ENGLISH_ONLY_KEYS] });
}

async function save(req, res) {
  const { key, lang } = req.body || {};
  if (typeof key !== "string" || typeof lang !== "string") {
    res.status(400).json({ error: "Send `key`, `lang` and `text`." });
    return;
  }
  const text = straighten(String(req.body.text ?? "")).trim();
  if (text.length > MAX_LENGTH) {
    res.status(400).json({ error: `Keep it under ${MAX_LENGTH} characters.` });
    return;
  }

  const [[keyRow], [language]] = await Promise.all([
    db(`btw_prompt_keys?key=${eq(key)}&select=placeholders`),
    db(`btw_languages?code=${eq(lang)}&select=code,active`),
  ]);
  if (!keyRow || !language) {
    res.status(404).json({ error: "No such prompt or language." });
    return;
  }
  if (lang !== "en" && ENGLISH_ONLY_KEYS.has(key)) {
    res.status(400).json({ error: "This message goes out before a language is chosen, so it only has English text." });
    return;
  }

  if (!text) {
    if (lang === "en") {
      res.status(400).json({ error: "English text can't be empty: it's the fallback for every language." });
      return;
    }
    if (language.active) {
      res.status(400).json({ error: "This language is switched on, so every prompt needs text. Switch it off to remove a translation." });
      return;
    }
    await db(`btw_prompts?key=${eq(key)}&lang=${eq(lang)}`, { method: "DELETE" });
    res.status(200).json({ prompt: null });
    return;
  }

  const missing = missingPlaceholders(text, keyRow.placeholders);
  if (missing.length) {
    const list = missing.map((p) => `{${p}}`).join(", ");
    res.status(400).json({ error: `Keep ${list} in the text. It's replaced with the real value when the message is sent.` });
    return;
  }

  const [prompt] = await db("btw_prompts?on_conflict=key,lang&select=key,lang,text,updated_at", {
    method: "POST",
    body: [{ key, lang, text }],
    prefer: "resolution=merge-duplicates,return=representation",
  });
  res.status(200).json({ prompt });
}
