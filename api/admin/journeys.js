// /api/admin/journeys.js
// The first 30 days for the team (Discipleship in /admin). Needs the admin session.
//
//   GET                       -> { journeys, totals }: everyone, with their church, day,
//                                check-ins and flag; totals: started, active this week,
//                                finished, flagged, check-in answers by day
//   GET ?part=days            -> { days: [{ day, lang, ... }], languages }
//   PUT ?part=days { day, lang, theme, passage, note, question, step } -> { day }:
//                                one day in one language; all empty removes a translation
//                                (English shows instead), never English
//   POST ?part=days-translate -> { results }: the English days, machine-translated into
//                                every switched-on language and saved, for a person to check
//   POST ?part=skip&id=       -> { ok }: demo only, moves someone a day further along
//   GET ?part=bible           -> { links: [{ lang, body }], languages }
//   PUT ?part=bible { lang, url } -> { link }: the Read it link for a language; it must
//                                contain {passage}; empty removes it (English's is used)

import { requireAdmin } from "../../lib/admin-auth.js";
import { CHECKIN_DAYS, journeysWithStatus, skipDay } from "../../lib/journeys.js";
import { db, dbAll, eq } from "../../lib/supabase.js";
import { translate } from "../../lib/translate.js";

const FIELDS = ["theme", "passage", "note", "question", "step"];
const MAX = { theme: 80, passage: 80, note: 600, question: 200, step: 200 };
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  const user = await requireAdmin(req, res);
  if (!user) return;
  try {
    const part = new URL(req.url, "http://x").searchParams.get("part");
    if (!part && req.method === "GET") return await list(res);
    if (part === "days" && req.method === "GET") return await days(res);
    if (part === "days" && req.method === "PUT") return await saveDay(req.body || {}, user, res);
    if (part === "days-translate" && req.method === "POST") return await translateDays(user, res);
    if (part === "skip" && req.method === "POST") {
      const id = await skipDay(new URL(req.url, "http://x").searchParams.get("id"));
      return id ? res.status(200).json({ ok: true }) : res.status(404).json({ error: "No such person." });
    }
    if (part === "bible" && req.method === "GET") return await bible(res);
    if (part === "bible" && req.method === "PUT") return await saveBible(req.body || {}, user, res);
    res.status(405).json({ error: "Not something this endpoint does." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function list(res) {
  const journeys = await journeysWithStatus();
  const ids = [...new Set(journeys.map((j) => j.church_id).filter(Boolean))];
  const churches = ids.length ? await db(`btw_churches?id=in.(${ids.join(",")})&select=id,phone,church_name,city,state,country`) : [];
  const byId = new Map(churches.map((c) => [String(c.id), c]));
  const rows = journeys.map((j) => {
    const c = byId.get(String(j.church_id));
    return { ...j, church_name: c?.church_name || null, church_phone: c?.phone || null };
  }).sort((a, b) => (!!b.flag - !!a.flag) || b.id - a.id);
  const answers = Object.fromEntries(CHECKIN_DAYS.map((d) => [d, { good: 0, hard: 0, question: 0 }]));
  for (const j of journeys) for (const c of j.checkins) answers[c.day][c.answer]++;
  const now = Date.now();
  res.status(200).json({
    journeys: rows,
    totals: {
      started: journeys.length,
      active_week: journeys.filter((j) => j.seen_at && now - Date.parse(j.seen_at) < WEEK_MS).length,
      finished: journeys.filter((j) => j.finished).length,
      flagged: journeys.filter((j) => j.flag).length,
      answers,
    },
  });
}

async function days(res) {
  const [rows, languages] = await Promise.all([
    dbAll("btw_journey_days?select=day,lang,theme,passage,note,question,step,updated_at&order=day,lang"),
    db("btw_languages?select=code,name,active&order=menu_order"),
  ]);
  res.status(200).json({ days: rows, languages });
}

async function saveDay(body, user, res) {
  const day = Number(body.day);
  const lang = String(body.lang || "");
  if (!Number.isInteger(day) || day < 1 || day > 30) return res.status(400).json({ error: "Pick a day from 1 to 30." });
  const [language] = await db(`btw_languages?code=${eq(lang)}&select=code`);
  if (!language) return res.status(400).json({ error: "No such language." });
  const row = Object.fromEntries(FIELDS.map((f) => [f, String(body[f] ?? "").replace(/\r\n/g, "\n").trim()]));
  if (FIELDS.every((f) => !row[f])) {
    if (lang === "en") return res.status(400).json({ error: "English can't be empty: it shows wherever a translation is missing." });
    await db(`btw_journey_days?day=eq.${day}&lang=${eq(lang)}`, { method: "DELETE" });
    return res.status(200).json({ day: null });
  }
  const missing = FIELDS.find((f) => !row[f]);
  if (missing) return res.status(400).json({ error: `Fill in the ${missing}.` });
  const long = FIELDS.find((f) => row[f].length > MAX[f]);
  if (long) return res.status(400).json({ error: `Keep the ${long} under ${MAX[long]} characters.` });
  const [saved] = await db("btw_journey_days?on_conflict=day,lang&select=day,lang,theme,passage,note,question,step,updated_at", {
    method: "POST",
    body: { day, lang, ...row, updated_by: user.id || null },
    prefer: "resolution=merge-duplicates,return=representation",
  });
  res.status(200).json({ day: saved });
}

// Every field of the 30 English days into each switched-on language: one
// request per language. Overwrites earlier translations.
async function translateDays(user, res) {
  const [english, languages] = await Promise.all([
    dbAll("btw_journey_days?lang=eq.en&select=day,theme,passage,note,question,step&order=day"),
    db("btw_languages?active=eq.true&select=code,name&order=menu_order"),
  ]);
  if (!english.length) return res.status(400).json({ error: "Save the English days first." });
  const pieces = english.flatMap((d) => FIELDS.map((f) => d[f]));
  const results = await Promise.all(languages.filter((l) => l.code !== "en").map(async (l) => {
    try {
      const out = await translate(pieces, l.code);
      const rows = english.map((d, i) => ({
        day: d.day, lang: l.code, updated_by: user.id || null,
        ...Object.fromEntries(FIELDS.map((f, k) => [f, out[i * FIELDS.length + k]])),
      }));
      await db("btw_journey_days?on_conflict=day,lang", { method: "POST", body: rows, prefer: "resolution=merge-duplicates" });
      return { lang: l.code, name: l.name, saved: true };
    } catch (err) {
      return { lang: l.code, name: l.name, saved: false, error: err.message };
    }
  }));
  res.status(200).json({ results });
}

async function bible(res) {
  const [links, languages] = await Promise.all([
    db("btw_guides?key=eq.bible_url&select=lang,body,updated_at"),
    db("btw_languages?select=code,name,active&order=menu_order"),
  ]);
  res.status(200).json({ links, languages });
}

async function saveBible(body, user, res) {
  const lang = String(body.lang || "");
  const url = String(body.url ?? "").trim();
  const [language] = await db(`btw_languages?code=${eq(lang)}&select=code`);
  if (!language) return res.status(400).json({ error: "No such language." });
  if (!url) {
    if (lang === "en") return res.status(400).json({ error: "English needs a link: it's used wherever a language has none." });
    await db(`btw_guides?key=eq.bible_url&lang=${eq(lang)}`, { method: "DELETE" });
    return res.status(200).json({ link: null });
  }
  if (!/^https:\/\/\S+$/.test(url) || !url.includes("{passage}")) {
    return res.status(400).json({ error: "Use an https:// link with {passage} where the reference goes." });
  }
  const [link] = await db("btw_guides?on_conflict=key,lang&select=lang,body,updated_at", {
    method: "POST",
    body: { key: "bible_url", lang, body: url, updated_by: user.id || null },
    prefer: "resolution=merge-duplicates,return=representation",
  });
  res.status(200).json({ link });
}
