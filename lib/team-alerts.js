// lib/team-alerts.js
// A text to each team member who asked for alerts (Users in /admin:
// btw_users.alert_phone) when a pastor writes to the team (api/sms-inbound.js
// toTeam). One alert per conversation until someone reads it: a second text
// while the first is still unread doesn't alert again. Sent from the signup
// number; texts back from an alert phone aren't answered.

import { logEvent } from "./events.js";
import { db, eq } from "./supabase.js";
import { canText, explainStatus, sendText } from "./voipms.js";

const SNIPPET = 70;

// Whether `phone` has team messages nobody has read yet (other than `exceptId`).
export async function hasUnread(phone, exceptId) {
  const rows = await db(`btw_messages?phone=${eq(phone)}&thread=eq.team&direction=eq.in&read_at=is.null&select=id&limit=2`);
  return rows.some((r) => r.id !== exceptId);
}

// "(213) 555-0177"
const pretty = (phone) => String(phone).replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3");

export function alertText({ church, phone, body, translation, media, site }) {
  const words = String(translation || body || "").replace(/\s+/g, " ").trim();
  const said = words ? `"${words.length > SNIPPET ? words.slice(0, SNIPPET - 1).trimEnd() + "…" : words}"` : media ? "(a picture)" : "(no words)";
  return `Baptize 2027: new message from ${church || pretty(phone)}: ${said} ${site}/admin#${phone ? "open=" + phone.replace(/^\+1/, "") : "conversations"}`;
}

// Texts every team member with an alert phone. Never throws: a failed alert
// is logged, and the pastor's text is already saved for the team.
export async function alertTeam({ phone, body, translation, media, site }) {
  try {
    const [users, [church]] = await Promise.all([
      db("btw_users?active=eq.true&select=id,name,alert_phone"),
      db(`btw_churches?phone=${eq(phone)}&select=church_name,simulated`),
    ]);
    if (church?.simulated) return 0;
    const to = users.filter((u) => canText(u.alert_phone));
    const text = alertText({ church: church?.church_name, phone, body, translation, media, site });
    const sent = await Promise.all(to.map(async (u) => {
      try {
        await sendText(canText(u.alert_phone), text);
        return true;
      } catch (err) {
        const why = err.status ? explainStatus(err.status) : err.message;
        await logEvent("warning", "team-alert", `The alert to ${u.name} wasn't sent: ${why}`, { phone });
        return false;
      }
    }));
    return sent.filter(Boolean).length;
  } catch (err) {
    await logEvent("warning", "team-alert", `Couldn't alert the team: ${err.message}`, { phone });
    return 0;
  }
}

// Whether `phone` is a team member's alert phone (their replies aren't a signup).
export async function isAlertPhone(phone) {
  const rows = await db(`btw_users?active=eq.true&alert_phone=${eq(phone)}&select=id&limit=1`);
  return rows.length > 0;
}
