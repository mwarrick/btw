// /api/admin/translate-all.js
// Translates one prompt's saved English text into every other language and
// saves the results. This is the editor's "Translate" button.
// Needs the admin session.
//
//   POST { key } -> { english, results: [{ lang, name, text, saved, error }] }
//
// "Every other language" means each one that is switched on or already has
// translations; a language nobody has started stays empty. A translation
// that loses a {placeholder} or runs over PROMPT_MAX characters is not
// saved, and its result says why.

import { requireAdmin } from "../../lib/admin-auth.js";
import { ENGLISH_ONLY_KEYS, PROMPT_MAX, missingPlaceholders } from "../../lib/prompts.js";
import { db, eq } from "../../lib/supabase.js";
import { translate } from "../../lib/translate.js";

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Use POST." });
    return;
  }
  try {
    await translateAll(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function translateAll(req, res) {
  const key = req.body?.key;
  if (typeof key !== "string" || !/^\w+$/.test(key)) {
    res.status(400).json({ error: "Send the prompt `key`." });
    return;
  }
  if (ENGLISH_ONLY_KEYS.has(key)) {
    res.status(400).json({ error: "This message goes out before a language is chosen, so it stays English only." });
    return;
  }

  const [[keyRow], [english], languages, started] = await Promise.all([
    db(`btw_prompt_keys?key=${eq(key)}&select=placeholders`),
    db(`btw_prompts?key=${eq(key)}&lang=eq.en&select=text`),
    db("btw_languages?select=code,name,active&order=menu_order"),
    db("btw_prompts?select=lang"),
  ]);
  if (!keyRow) {
    res.status(404).json({ error: "No such prompt." });
    return;
  }
  if (!english?.text) {
    res.status(400).json({ error: "Save the English text first." });
    return;
  }

  const hasText = new Set(started.map((p) => p.lang));
  const targets = languages.filter((l) => l.code !== "en" && (l.active || hasText.has(l.code)));

  // One request per language: Google translates into a single target at a time.
  const results = await Promise.all(targets.map(async (l) => {
    try {
      const [text] = await translate([english.text], l.code);
      const missing = missingPlaceholders(text, keyRow.placeholders);
      if (missing.length) {
        return { lang: l.code, name: l.name, text, saved: false, error: `Lost ${missing.map((p) => `{${p}}`).join(", ")}, so it wasn't saved.` };
      }
      if (text.length > PROMPT_MAX) {
        return { lang: l.code, name: l.name, text, saved: false, error: `${text.length} characters, over the ${PROMPT_MAX} limit, so it wasn't saved. Shorten the English, or write this one in its own language.` };
      }
      return { lang: l.code, name: l.name, text, saved: true };
    } catch (err) {
      return { lang: l.code, name: l.name, text: null, saved: false, error: err.message };
    }
  }));

  const rows = results.filter((r) => r.saved).map((r) => ({ key, lang: r.lang, text: r.text }));
  if (rows.length) {
    const stored = await db("btw_prompts?on_conflict=key,lang&select=lang,text,updated_at", {
      method: "POST",
      body: rows,
      prefer: "resolution=merge-duplicates,return=representation",
    });
    const byLang = Object.fromEntries(stored.map((s) => [s.lang, s]));
    for (const r of results) if (byLang[r.lang]) r.updated_at = byLang[r.lang].updated_at;
  }

  res.status(200).json({ english: english.text, results });
}
