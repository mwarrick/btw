// lib/prompts.js
// Rules for prompt text that both the editor API and the SMS handler need.

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
