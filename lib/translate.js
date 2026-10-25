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

// Names that stay in English in every language.
const KEEP = /\bBaptize(?: 2027)?\b/g;

// Translates `texts` into the language `target` (e.g. "es"), from English
// unless `source` says otherwise (null: Google works it out). Placeholders
// such as {name}, and the program name, come back untouched. Same order as
// `texts`.
export async function translate(texts, target, source = "en") {
  const provider = process.env.TRANSLATE_PROVIDER || "google";
  if (provider !== "google") throw new Error(`Unknown TRANSLATE_PROVIDER "${provider}".`);

  const out = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    out.push(...(await googleTranslate(texts.slice(i, i + BATCH), target, source)));
  }
  return out;
}

// Guesses the language of `text`: { lang, confidence } with lang a base
// code such as "es" or "zh" (Google's "zh-CN" becomes "zh") and confidence
// from 0 to 1. Short texts like "hi" often come back unsure.
export async function detect(text) {
  const provider = process.env.TRANSLATE_PROVIDER || "google";
  if (provider !== "google") throw new Error(`Unknown TRANSLATE_PROVIDER "${provider}".`);
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) throw new Error("GOOGLE_TRANSLATE_API_KEY is not set.");

  const res = await fetch(`${GOOGLE_URL}/detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
    body: JSON.stringify({ q: text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Google Translate returned ${res.status}.`);

  const best = data.data.detections?.[0]?.[0];
  if (!best || best.language === "und") return { lang: null, confidence: 0 };
  return { lang: best.language.split("-")[0].toLowerCase(), confidence: Number(best.confidence) || 0 };
}

async function googleTranslate(texts, target, source) {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) throw new Error("GOOGLE_TRANSLATE_API_KEY is not set.");

  // HTML mode lets placeholders and names be marked translate="no".
  const q = texts.map((t) =>
    escapeHtml(t)
      .replace(/\{(\w+)\}/g, '<span translate="no">{$1}</span>')
      .replace(KEEP, '<span translate="no">$&</span>')
      .replace(/\n/g, "<br>")
  );

  const res = await fetch(GOOGLE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
    body: JSON.stringify({ q, ...(source ? { source } : {}), target, format: "html" }),
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

// Translates pieces of our own HTML (a page's paragraphs, with their <b> and
// <a> tags) into `target`, keeping the tags and the program name. The
// result is HTML; callers that show it must only allow the tags they expect.
export async function translateHtml(htmls, target, source = "en") {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) throw new Error("GOOGLE_TRANSLATE_API_KEY is not set.");
  const out = [];
  for (let i = 0; i < htmls.length; i += BATCH) {
    const q = htmls.slice(i, i + BATCH).map((h) => h.replace(KEEP, '<span translate="no">$&</span>'));
    const res = await fetch(GOOGLE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key },
      body: JSON.stringify({ q, source, target, format: "html" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `Google Translate returned ${res.status}.`);
    out.push(...data.data.translations.map((t) => t.translatedText.replace(/<span translate="no">([\s\S]*?)<\/span>/g, "$1")));
  }
  return out;
}
