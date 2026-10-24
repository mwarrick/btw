// lib/journeys.js
// The first 30 days of faith, shared by the person's page (api/journey.js),
// their church's page (api/profile.js) and /admin (api/admin/journeys.js).
// Online only: nothing is texted. Day N opens on the Nth calendar day after
// starting, in the time zone their browser gave; missed days stay open.

import { db, dbAll } from "./supabase.js";

export const DAYS = 30;
export const CHECKIN_DAYS = [7, 14, 21, 30];
export const NEXT_STEPS = ["group", "serve", "class", "unsure"];
// A missed check-in flags someone this many days after it opened.
const MISSED_AFTER = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export function validZone(tz) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return typeof tz === "string" && tz.length <= 64 ? tz : "UTC";
  } catch {
    return "UTC";
  }
}

// "YYYY-MM-DD" for now (or `at`) in `tz`.
export function dateIn(tz, at = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: validZone(tz), year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
}
const daysBetween = (from, to) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

// Which day it is for them today: 1 on the day they started, past 30 once
// all days are open.
export const currentDay = (j, at = new Date()) => Math.max(1, daysBetween(j.started_on, dateIn(j.tz, at)) + 1);

// Why their church should call, or null: a check-in answered "It's hard" or
// "I have a question", or one missed for 3 days, since the church last
// pressed We talked.
export function flagOf(j, checkins, at = new Date()) {
  const talked = j.talked_at ? Date.parse(j.talked_at) : 0;
  const latest = checkins
    .filter((c) => c.answer !== "good" && Date.parse(c.created_at) > talked)
    .sort((a, b) => b.day - a.day)[0];
  if (latest) return { reason: latest.answer, day: latest.day };
  const today = dateIn(j.tz, at);
  for (const day of [...CHECKIN_DAYS].reverse()) {
    if (checkins.some((c) => c.day === day)) continue;
    const late = addDays(j.started_on, day - 1 + MISSED_AFTER);
    if (today >= late && Date.parse(`${late}T23:59:59Z`) > talked) return { reason: "missed", day };
  }
  return null;
}

// The 30 days in `lang`, each day falling back to English.
export async function loadDays(lang) {
  const langs = encodeURIComponent(`(${[...new Set(["en", lang])].join(",")})`);
  const rows = await dbAll(`btw_journey_days?lang=in.${langs}&select=day,lang,theme,passage,note,question,step&order=day,lang`);
  const out = [];
  for (let d = 1; d <= DAYS; d++) {
    const en = rows.find((r) => r.day === d && r.lang === "en");
    const own = rows.find((r) => r.day === d && r.lang === lang);
    out.push({ ...(en || {}), ...(own || {}), day: d, english_passage: en?.passage || own?.passage || "" });
  }
  return out;
}

// The "Read it" link: the language's Bible link with the English reference
// (Bible Gateway understands English book names in every version).
export async function bibleTemplate(lang) {
  const langs = encodeURIComponent(`(${[...new Set(["en", lang])].join(",")})`);
  const rows = await db(`btw_guides?key=eq.bible_url&lang=in.${langs}&select=lang,body`);
  return (rows.find((r) => r.lang === lang) || rows.find((r) => r.lang === "en"))?.body || "";
}
export const readUrl = (template, passage) =>
  template && passage ? template.replace("{passage}", encodeURIComponent(passage.replace(/[–—]/g, "-"))) : null;

// Everyone on their first 30 days for these churches (all when `churchIds`
// is null), with progress, check-ins and flags.
export async function journeysWithStatus(churchIds = null) {
  if (churchIds && !churchIds.length) return [];
  const filter = churchIds ? `church_id=in.(${churchIds.join(",")})&` : "";
  const journeys = await dbAll(`btw_journeys?${filter}select=id,church_id,testimony_id,first_name,lang,phone,contact_ok,started_on,tz,done_days,next_step,talked_at,seen_at,created_at&order=id`);
  if (!journeys.length) return [];
  const checkins = await dbAll(`btw_checkins?journey_id=in.(${journeys.map((j) => j.id).join(",")})&select=journey_id,day,answer,note,created_at&order=id`);
  return journeys.map((j) => {
    const mine = checkins.filter((c) => c.journey_id === j.id);
    const day = currentDay(j);
    return {
      ...j, day: Math.min(day, DAYS), done: (j.done_days || []).length, finished: day > DAYS || (j.done_days || []).length === DAYS,
      checkins: mine.map(({ day, answer, note, created_at }) => ({ day, answer, note, created_at })), flag: flagOf(j, mine),
    };
  });
}
