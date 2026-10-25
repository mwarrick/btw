// lib/web-guard.js
// Protection for the public forms that can send texts: the signup form
// (/signup, api/profile.js POST), Get my link on the front page and the
// testimony link (/story, api/story.js).
//
//   1. The phone is verified with a 6-digit code before a web signup is saved
//      (btw_web_codes: a salted hash, 10 minutes, 5 tries).
//   2. Bot checks: a hidden field people never fill in, and a form sent less
//      than 3 seconds after the page opened. Bots get a normal-looking answer
//      and nothing is sent or saved.
//   3. Limits per visitor (IP address, stored only as a salted hash) and per
//      number, counted in btw_web_requests.
//   4. A daily cap on texts these forms send (WEB_TEXTS_PER_DAY, default 300,
//      over any 24 hours). Past it nothing more is sent and an error goes to
//      the Log panel once a day.
//
// Env vars:
//   WEB_TEXTS_PER_DAY  optional; the daily cap above
//   ADMIN_PASSWORD     already set; also salts the hashes here

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { logEvent } from "./events.js";
import { db, eq } from "./supabase.js";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
export const CODE_MINUTES = 10;
const CODE_TRIES = 5;
const MIN_FILL_MS = 3000;

// [kind, by, how many, within]: more than that is refused.
const LIMITS = {
  code: [["phone", 1, MINUTE], ["phone", 3, HOUR], ["ip", 10, HOUR], ["ip", 30, DAY]],
  link: [["phone", 1, 10 * MINUTE], ["ip", 5, HOUR], ["ip", 20, DAY]],
  story: [["phone", 1, 10 * MINUTE], ["ip", 5, HOUR], ["ip", 20, DAY]],
  // A writer texting their parent or guardian the approval link.
  guardian: [["phone", 1, 10 * MINUTE], ["ip", 5, HOUR], ["ip", 20, DAY]],
  // Starting the first 30 days: only visitors are limited (the texted link is journey_link).
  journey: [["ip", 10, HOUR], ["ip", 30, DAY]],
  // The 30-days link texted when they start (api/journey.js).
  journey_link: [["phone", 1, 10 * MINUTE], ["ip", 5, HOUR], ["ip", 20, DAY]],
};

const salt = () => process.env.ADMIN_PASSWORD || "btw";
const hash = (text) => createHash("sha256").update(`${salt()}:${text}`).digest("hex");
const since = (ms) => encodeURIComponent(new Date(Date.now() - ms).toISOString());

// The visitor's address as Vercel passes it, hashed.
export function visitor(req) {
  const ip = String(req.headers?.["x-forwarded-for"] || req.headers?.["x-real-ip"] || req.socket?.remoteAddress || "").split(",")[0].trim();
  return hash(`ip:${ip || "unknown"}`);
}

// A form filled in by a bot: the hidden field has text, or it came back
// faster than a person could fill it in (`elapsed`: ms since the page opened).
export function looksLikeBot(body) {
  // The hidden box people never see (hpx on the signup form, company_hp from
  // the others). It's no longer labeled "Company": browsers' autofill filled
  // it from the person's contact card, and real people were taken for bots.
  if (String(body.company_hp || body.hpx || "").trim()) return true;
  const elapsed = Number(body.elapsed);
  return !Number.isFinite(elapsed) || elapsed < MIN_FILL_MS;
}

export async function record(kind, ip, phone = null) {
  await db("btw_web_requests", { method: "POST", body: { kind, ip, phone, created_at: new Date().toISOString() } });
}

// Whether one more `kind` from this visitor and number stays within LIMITS.
export async function withinLimits(kind, ip, phone) {
  const checks = await Promise.all(LIMITS[kind].map(async ([by, max, within]) => {
    const value = by === "ip" ? ip : phone;
    const rows = await db(`btw_web_requests?kind=eq.${kind}&${by}=${eq(value)}&created_at=gte.${since(within)}&select=id&limit=${max}`);
    return rows.length < max;
  }));
  return checks.every(Boolean);
}

// Whether the daily cap leaves room for one more text. The first refusal in
// a day is logged as an error so the team sees it in the Log panel.
export async function textsLeft() {
  const cap = Number(process.env.WEB_TEXTS_PER_DAY) || 300;
  const sentToday = await db(`btw_web_requests?kind=in.(code,link,welcome,story,guardian,journey_link)&created_at=gte.${since(DAY)}&select=id&limit=${cap}`);
  if (sentToday.length < cap) return true;
  const logged = await db(`btw_events?source=eq.web-cap&created_at=gte.${since(DAY)}&select=id&limit=1`);
  if (!logged.length) {
    await logEvent("error", "web-cap", `The signup form, Get my link and the testimony form reached ${cap} texts in 24 hours, so they've stopped sending. Raise WEB_TEXTS_PER_DAY in Vercel if this is real use.`);
  }
  return false;
}

// A new code for `phone`, replacing any earlier one. Returns the code.
export async function newCode(phone) {
  const code = String(randomInt(0, 1000000)).padStart(6, "0");
  await db("btw_web_codes?on_conflict=phone", {
    method: "POST",
    body: { phone, code_hash: hash(`code:${phone}:${code}`), attempts: 0,
      expires_at: new Date(Date.now() + CODE_MINUTES * MINUTE).toISOString(), created_at: new Date().toISOString() },
    prefer: "resolution=merge-duplicates",
  });
  // Old rows aren't needed past a day; trimmed here, now and then.
  await db(`btw_web_requests?created_at=lt.${since(2 * DAY)}`, { method: "DELETE" });
  return code;
}

// Checks `code` for `phone`: "ok" (and the code is used up), "wrong", or
// "expired" (none sent, past 10 minutes, or too many wrong tries).
export async function checkCode(phone, code) {
  const [row] = await db(`btw_web_codes?phone=${eq(phone)}&select=code_hash,attempts,expires_at`);
  if (!row || row.attempts >= CODE_TRIES || new Date(row.expires_at) < new Date()) return "expired";
  const given = Buffer.from(hash(`code:${phone}:${String(code || "").replace(/\D/g, "")}`));
  if (given.length === row.code_hash.length && timingSafeEqual(given, Buffer.from(row.code_hash))) {
    await db(`btw_web_codes?phone=${eq(phone)}`, { method: "DELETE" });
    return "ok";
  }
  await db(`btw_web_codes?phone=${eq(phone)}`, { method: "PATCH", body: { attempts: row.attempts + 1 } });
  return row.attempts + 1 >= CODE_TRIES ? "expired" : "wrong";
}
