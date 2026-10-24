// lib/journeys.js
// The first 30 days of faith, shared by the person's page (api/journey.js),
// their church's page (api/profile.js) and /admin (api/admin/journeys.js).
// Online only: nothing is texted. Day N opens on the Nth calendar day after
// starting, in the time zone their browser gave; missed days stay open.

import { newProfileKey } from "./profile-link.js";
import { db, dbAll } from "./supabase.js";

export const DAYS = 30;
export const CHECKIN_DAYS = [7, 14, 21, 30];
export const NEXT_STEPS = ["group", "serve", "class", "unsure"];
// A missed check-in flags someone this many days after it opened.
const MISSED_AFTER = 3;
// Not opening their page for this many days is "gone quiet".
const QUIET_AFTER = 3;
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

// When they last opened their page or answered a check-in.
export function lastActive(j, checkins) {
  return Math.max(Date.parse(j.seen_at || j.created_at || 0) || 0, ...checkins.map((c) => Date.parse(c.created_at) || 0));
}

// Why their church should call, or null, since the church last pressed We
// talked: a check-in answered "It's hard" or "I have a question"; gone quiet
// (3 days without opening their page, until the 30 days are done); or a
// check-in missed for 3 days.
export function flagOf(j, checkins, at = new Date()) {
  const talked = j.talked_at ? Date.parse(j.talked_at) : 0;
  const latest = checkins
    .filter((c) => c.answer !== "good" && Date.parse(c.created_at) > talked)
    .sort((a, b) => b.day - a.day)[0];
  if (latest) return { reason: latest.answer, day: latest.day };
  const done = (j.done_days || []).length === DAYS || (j.done_days || []).includes(DAYS) || checkins.some((c) => c.day === DAYS);
  const since = Math.max(lastActive(j, checkins), talked);
  const quiet = Math.floor((at.getTime() - since) / DAY_MS);
  if (!done && quiet >= QUIET_AFTER) return { reason: "quiet", days: quiet, day: Math.min(currentDay(j, at), DAYS) };
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
  const journeys = await dbAll(`btw_journeys?${filter}select=id,church_id,testimony_id,first_name,lang,phone,contact_ok,started_on,tz,done_days,next_step,talked_at,seen_at,created_at,simulated&order=id`);
  if (!journeys.length) return [];
  const checkins = await dbAll(`btw_checkins?journey_id=in.(${journeys.map((j) => j.id).join(",")})&select=journey_id,day,answer,note,created_at&order=id`);
  return journeys.map((j) => {
    const mine = checkins.filter((c) => c.journey_id === j.id);
    const day = currentDay(j);
    return {
      ...j, day: Math.min(day, DAYS), done: (j.done_days || []).length, finished: day > DAYS || (j.done_days || []).length === DAYS,
      checkins: mine.map(({ day, answer, note, created_at }) => ({ day, answer, note, created_at })), flag: flagOf(j, mine),
      last_active: new Date(lastActive(j, mine)).toISOString(),
    };
  });
}

// Demo only: moves someone a day further along by starting them a day
// earlier. Their activity is left alone, so it doesn't make them quiet.
export async function skipDay(id) {
  const [j] = await db(`btw_journeys?id=eq.${Number(id) || 0}&select=id,started_on`);
  if (!j) return null;
  await db(`btw_journeys?id=eq.${j.id}`, { method: "PATCH", body: { started_on: addDays(j.started_on, -1) } });
  return j.id;
}

// Made-up newly baptized people for the demo, from the hackathon's test data
// (tracks/3-first-30-days/test-data/new-believers.csv): two started today,
// one under 18 with no phone, two gone quiet and one who said it's hard.
// They join the first finished church simulation; never texted (nothing is).
const SAMPLE_PEOPLE = [
  { first_name: "Carla", lang: "es", daysAgo: 0, activeDay: 1, done: 0, phone: "+12135550141" },
  { first_name: "Mateus", lang: "pt", daysAgo: 0, activeDay: 1, done: 1, phone: "+12135550142" },
  { first_name: "Jordan", lang: "en", daysAgo: 0, activeDay: 1, done: 1, phone: null },
  { first_name: "Rosa", lang: "es", daysAgo: 7, activeDay: 3, done: 3, phone: "+12135550144" },
  { first_name: "Paulo", lang: "pt", daysAgo: 14, activeDay: 12, done: 12, phone: "+12135550145",
    checkins: [{ day: 7, answer: "hard", note: "Work has been hard and I missed church on Sunday." }] },
  { first_name: "Mika", lang: "en", daysAgo: 21, activeDay: 1, done: 1, phone: "+12135550146" },
];
const TZ = "America/Los_Angeles";

export async function addSampleJourneys(churchId, at = new Date()) {
  await removeSampleJourneys();
  if (!churchId) return 0;
  const today = dateIn(TZ, at);
  const rows = SAMPLE_PEOPLE.map((p) => {
    const started = addDays(today, -p.daysAgo);
    // Last opened on their last active day, mid-morning.
    const seen = new Date(Math.min(Date.parse(`${addDays(started, p.activeDay - 1)}T17:00:00Z`), at.getTime() - 60000)).toISOString();
    return {
      key: newProfileKey(), church_id: churchId, first_name: p.first_name, lang: p.lang, phone: p.phone, contact_ok: !!p.phone,
      consent_text: "Simulation", consent_at: `${started}T16:00:00Z`, started_on: started, tz: TZ,
      done_days: Array.from({ length: p.done }, (_, i) => i + 1), seen_at: seen, simulated: true,
    };
  });
  const saved = await db("btw_journeys?select=id,first_name", { method: "POST", body: rows, prefer: "return=representation" });
  const checkins = SAMPLE_PEOPLE.flatMap((p) => (p.checkins || []).map((c) => {
    const j = saved.find((s) => s.first_name === p.first_name);
    return { journey_id: j.id, day: c.day, answer: c.answer, note: c.note, created_at: `${addDays(addDays(today, -p.daysAgo), c.day - 1)}T18:00:00Z` };
  }));
  if (checkins.length) await db("btw_checkins", { method: "POST", body: checkins });
  return rows.length;
}

// The sample people alone, without touching the church simulations: at the
// first simulated church that finished signing up. Returns how many, or 0
// when there's no such church yet.
export async function addSampleJourneysToSimulation() {
  const [church] = await db("btw_churches?simulated=eq.true&completed_at=not.is.null&select=id&order=created_at&limit=1");
  return church ? addSampleJourneys(church.id) : 0;
}

export async function removeSampleJourneys() {
  await db("btw_journeys?simulated=eq.true", { method: "DELETE" });
}
