// /api/admin/languages.js
// Switches languages on and off in the SMS menu and edits their menu
// label. Needs the admin session.
//
//   PATCH { code, active?, menu_label? } -> { language }
//
// A language can only be switched on once every prompt has text in it.

import { requireAdmin } from "../../lib/admin-auth.js";
import { ENGLISH_ONLY_KEYS, straighten } from "../../lib/prompts.js";
import { db, eq } from "../../lib/supabase.js";
import { isGsm } from "../../public/js/sms.js";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    res.status(405).json({ error: "Use PATCH." });
    return;
  }
  try {
    await update(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  const { code, active, menu_label } = req.body || {};
  const [language] = typeof code === "string" ? await db(`btw_languages?code=${eq(code)}&select=code`) : [];
  if (!language) {
    res.status(404).json({ error: "No such language." });
    return;
  }

  const changes = {};

  if (active !== undefined) {
    if (typeof active !== "boolean") {
      res.status(400).json({ error: "`active` must be true or false." });
      return;
    }
    if (code === "en" && !active) {
      res.status(400).json({ error: "English can't be switched off: it's the fallback for every other language." });
      return;
    }
    if (active) {
      const missing = await missingKeys(code);
      if (missing.length) {
        res.status(400).json({ error: `${missing.length} prompts still need text in this language.`, missing });
        return;
      }
    }
    changes.active = active;
  }

  if (menu_label !== undefined) {
    const label = straighten(String(menu_label)).trim();
    if (!label || label.length > 20) {
      res.status(400).json({ error: "The menu label needs 1 to 20 characters." });
      return;
    }
    if (!isGsm(label)) {
      res.status(400).json({
        error: "Use plain letters in the menu label, without accents or other scripts. One such character turns the whole language menu into a Unicode SMS, which holds less than half as much text.",
      });
      return;
    }
    changes.menu_label = label;
  }

  if (!Object.keys(changes).length) {
    res.status(400).json({ error: "Nothing to change." });
    return;
  }

  const [updated] = await db(`btw_languages?code=${eq(code)}`, {
    method: "PATCH",
    body: changes,
    prefer: "return=representation",
  });
  res.status(200).json({ language: updated });
}

// Prompt keys with no text yet in `lang`.
async function missingKeys(lang) {
  const [keys, have] = await Promise.all([
    db("btw_prompt_keys?select=key"),
    db(`btw_prompts?lang=${eq(lang)}&select=key`),
  ]);
  const done = new Set(have.map((p) => p.key));
  return keys.map((k) => k.key).filter((k) => !ENGLISH_ONLY_KEYS.has(k) && !done.has(k));
}
