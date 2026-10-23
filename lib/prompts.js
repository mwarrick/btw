// lib/prompts.js
// Rules for prompt text that both the editor API and the SMS handler need.

import { db } from "./supabase.js";

// The most characters one prompt may hold: one standard SMS. Messages that
// combine prompts (the menu, the summary) or use a non-Latin script can
// still run longer, and then go out as MMS.
export const PROMPT_MAX = 160;

// Sent before anyone has picked a language, so only English is ever used.
export const ENGLISH_ONLY_KEYS = new Set(["menu_intro", "menu_footer", "menu_invalid"]);

// Curly quotes, long dashes and the like turn a whole message into a
// 70-character Unicode SMS, so stored text uses the plain versions.
export function straighten(text) {
  return text
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―]/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ");
}

// Placeholder names (without braces) that `text` no longer contains.
export function missingPlaceholders(text, placeholders = []) {
  return placeholders.filter((p) => !text.includes(`{${p}}`));
}

// What createEngine() in public/js/engine.js needs: the switched-on
// languages in menu order, and every prompt in English and in those
// languages, as { en: { key: text }, ... }.
export async function loadPrompts() {
  const languages = await db("btw_languages?active=eq.true&select=code,name,menu_label&order=menu_order");
  const codes = [...new Set(["en", ...languages.map((l) => l.code)])];
  const rows = await db(`btw_prompts?lang=in.${encodeURIComponent(`(${codes.join(",")})`)}&select=key,lang,text`);

  const prompts = {};
  for (const row of rows) (prompts[row.lang] ||= {})[row.key] = row.text;
  return { languages, prompts };
}
