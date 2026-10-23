// lib/events.js
// Records a problem in btw_events, where the Log panel in /admin shows it,
// and in Vercel's logs. Never throws: a failed write only reaches the
// Vercel logs, so logging can't break the request it describes.

import { db } from "./supabase.js";

// logEvent("error", "sms-inbound", "voip.ms refused the reply.", { phone, detail: { status } })
export async function logEvent(level, source, message, { phone = null, detail = null } = {}) {
  (level === "error" ? console.error : console.warn)(`${source}:`, message, phone || "", detail ? JSON.stringify(detail) : "");
  try {
    await db("btw_events", { method: "POST", body: { level, source, phone, message, detail } });
  } catch (err) {
    console.error("events: couldn't record the event:", err.message);
  }
}
