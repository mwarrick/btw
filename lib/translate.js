// lib/translate.js
// Machine translation behind one function, so the provider can change
// without touching the callers. Google Cloud Translation (Basic, v2) is the
// only provider so far.
//
// Env vars:
//   GOOGLE_TRANSLATE_API_KEY  API key restricted to the Cloud Translation API
//   TRANSLATE_PROVIDER        optional; "google" is the default and only option

import { straighten } from "./prompts.js";

const GOOGLE_URL = "https://translation.googleapis.com/language/translate/v2";
const BATCH = 100; // Google takes up to 128 texts per request

// Translates English `texts` into the language `target` (e.g. "es").
// Placeholders such as {name} come back untouched. Same order as `texts`.
export async function translate(texts, target) {
  const provider = process.env.TRANSLATE_PROVIDER || "google";
  if (provider !== "google") throw new Error(`Unknown TRANSLATE_PROVIDER "${provider}".`);

  const out = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    out.push(...(await googleTranslate(texts.slice(i, i + BATCH), target)));
  }
  return out;
}

async function googleTranslate(texts, target) {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) throw new Error("GOOGLE_TRANSLATE_API_KEY is not set.");

  // HTML mode lets placeholders be marked translate="no".
  const q = texts.map((t) =>
    escapeHtml(t)
      .replace(/\{(\w+)\}/g, '<span translate="no">{$1}</span>')
      .replace(/\n/g, "<br>")
  );

  const res = await fetch(GOOGLE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
    body: JSON.stringify({ q, source: "en", target, format: "html" }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Google Translate returned ${res.status}.`);

  return data.data.translations.map((t) => straighten(fromHtml(t.translatedText)));
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function fromHtml(s) {
  return s
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?span[^>]*>/gi, "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}
