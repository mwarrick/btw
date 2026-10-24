// lib/web-text.js
// Shared by the public pages' APIs (api/profile.js, api/story.js): their
// wording from btw_prompts, the switched-on languages, and phone numbers.

import { db } from "./supabase.js";

export const RTL = new Set(["ar", "ur"]);
export const dir = (lang) => (RTL.has(lang) ? "rtl" : "ltr");

// `keys` in `lang`, English where a translation is missing.
export async function wording(lang, keys) {
  const list = encodeURIComponent(`(${keys.join(",")})`);
  const langs = encodeURIComponent(`(${[...new Set(["en", lang])].join(",")})`);
  const rows = await db(`btw_prompts?key=in.${list}&lang=in.${langs}&select=key,lang,text`);
  const out = {};
  for (const r of rows) if (r.lang === "en" && !(r.key in out)) out[r.key] = r.text;
  for (const r of rows) if (r.lang === lang) out[r.key] = r.text;
  return out;
}

// The switched-on languages, by their own names, and `wanted` when it's one
// of them (else English).
export async function languages(wanted) {
  const rows = await db("btw_languages?active=eq.true&select=code,name,menu_label&order=menu_order");
  return {
    languages: rows.map((l) => ({ code: l.code, name: l.menu_label || l.name })),
    lang: rows.some((l) => l.code === wanted) ? wanted : "en",
  };
}

// A typed number as stored: +1 and 10 digits. The forms text it, and only US
// and Canadian numbers can be texted from our number (see docs/gaps.md).
export function phoneValue(input) {
  const d = String(input || "").replace(/\D/g, "");
  if (d.length === 10 && /^[2-9]/.test(d)) return `+1${d}`;
  if (d.length === 11 && d[0] === "1" && /^[2-9]/.test(d.slice(1))) return `+${d}`;
  return null;
}

// A typed number from any country, as stored: + and its country code. A
// number without + (or 00) is read as a US or Canadian one. Whether it can be
// texted is the provider's business (canText in lib/voipms.js).
export function anyPhoneValue(input) {
  const raw = String(input || "").trim();
  if (!/^(\+|00)/.test(raw)) return phoneValue(raw);
  const d = raw.replace(/^00/, "").replace(/\D/g, "");
  if (d[0] === "1") return phoneValue(d);
  return /^[2-9]\d{7,14}$/.test(d) ? `+${d}` : null;
}
