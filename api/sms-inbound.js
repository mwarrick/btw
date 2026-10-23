// /api/sms-inbound.js
// Receives incoming texts from voip.ms (the DID's "SMS URL Callback") and
// runs the signup conversation: every text to the number starts or carries
// on that number's signup, with no keyword needed.
//
// Set the callback on the DID in the voip.ms portal to:
//   https://<your-site>/api/sms-inbound?key=<SMS_INBOUND_KEY>&to={TO}&from={FROM}&message={MESSAGE}&id={ID}&date={TIMESTAMP}
// and enable "URL callback retry" so voip.ms resends until it gets "ok".
//
// Sources disagree on whether voip.ms sends GET with placeholders (sometimes
// separated by ";" instead of "&") or POST with a JSON body, so this accepts both.
//
// For each text:
//   1. record it in btw_messages; a voip.ms id seen before is a retry and stops here
//   2. load the number's btw_sessions and btw_churches rows (none: a new signup)
//   3. run public/js/engine.js on it with the prompts from btw_prompts
//   4. save the new state and answers, then send the replies and record them
//
// Env vars:
//   SMS_INBOUND_KEY  shared secret in the callback URL; voip.ms doesn't sign requests
//   plus those of lib/supabase.js and lib/voipms.js

import { createEngine, newState } from "../public/js/engine.js";
import { loadPrompts } from "../lib/prompts.js";
import { db, eq } from "../lib/supabase.js";
import { logEvent } from "../lib/events.js";
import { explainStatus, sendText } from "../lib/voipms.js";

// btw_churches columns the engine keeps in state.data under the same name.
const ANSWER_COLUMNS = [
  "name", "email", "church_name", "street", "city", "state", "zip",
  "denomination", "website", "contact_name", "contact_phone", "baptism_same",
  "baptism_street", "baptism_city", "baptism_state", "baptism_zip", "public_map",
];

export default async function handler(req, res) {
  const query = parseQuery(req.url);

  if (!process.env.SMS_INBOUND_KEY || query.key !== process.env.SMS_INBOUND_KEY) {
    await logEvent("warning", "sms-inbound", process.env.SMS_INBOUND_KEY
      ? "A callback came in with the wrong key, so it was refused. Check the key in the SMS URL Callback on the DID matches SMS_INBOUND_KEY."
      : "A callback came in, but SMS_INBOUND_KEY isn't set in Vercel, so it was refused.");
    res.status(401).send("unauthorized");
    return;
  }

  const sms = normalize({ ...query, ...flattenBody(req.body) });

  if (!sms.from || !sms.to) {
    await logEvent("warning", "sms-inbound", "A callback came in without a from or to number.", { detail: sms });
    res.status(400).send("missing from/to");
    return;
  }

  console.log("Inbound SMS", JSON.stringify(sms));

  // Short codes and other non-US/Canada senders can't be replied to.
  if (sms.from.length !== 10) {
    res.status(200).send("ok");
    return;
  }

  try {
    await converse(sms);
    res.status(200).send("ok");
  } catch (err) {
    // Anything but "ok" makes voip.ms retry later.
    await logEvent("error", "sms-inbound", `Couldn't handle an incoming text; voip.ms will retry it. ${err.message}`,
      { phone: "+1" + sms.from, detail: { message: sms.message } });
    res.status(500).send("error");
  }
}

async function converse(sms) {
  const phone = "+1" + sms.from;

  const [logged] = await db("btw_messages?on_conflict=provider_id", {
    method: "POST",
    body: { provider_id: sms.id, phone, direction: "in", body: sms.message },
    prefer: "resolution=ignore-duplicates,return=representation",
  });
  if (!logged) return; // a retry of a text already handled

  let replies;
  try {
    const [[session], [church], { languages, prompts }] = await Promise.all([
      db(`btw_sessions?phone=${eq(phone)}&select=*`),
      db(`btw_churches?phone=${eq(phone)}&select=*`),
      loadPrompts(),
    ]);
    const engine = createEngine({ prompts, languages });
    const before = toState(session, church);
    // A new number's first text, whatever it says, gets the language menu;
    // only an opt-out word is taken at its word.
    let result = engine.reply(before, sms.message);
    if (!session && result.state.phase !== "stopped") result = engine.start();
    await save(phone, before, result.state, church);
    replies = result.replies;
  } catch (err) {
    // Forget the text so voip.ms's retry runs it again.
    await db(`btw_messages?id=eq.${logged.id}`, { method: "DELETE" }).catch(() => {});
    throw err;
  }

  // The state is already saved, so a failed send isn't retried: that would
  // run the same answer through the engine twice. The failed reply is kept
  // with its error, so the conversation in /admin shows it, and the rest
  // aren't sent.
  for (const [i, body] of replies.entries()) {
    let error = null;
    try {
      await sendText(sms.from, body);
    } catch (err) {
      error = err.status ? explainStatus(err.status) : `Couldn't reach ${process.env.VOIPMS_API_URL ? "the relay" : "voip.ms"}: ${err.message}`;
      const left = replies.length - i;
      await logEvent("error", "sms-inbound", `A reply wasn't sent${left > 1 ? ` (nor the ${left - 1} after it)` : ""}: ${error}`,
        { phone, detail: { status: err.status || null, length: body.length } });
    }
    await db("btw_messages", { method: "POST", body: { phone, direction: "out", body, error } })
      .catch((err) => console.error("sms-inbound: couldn't record a reply:", err.message));
    if (error) break;
  }
}

// The engine's state from the two rows; a number with no session is new.
function toState(session, church) {
  if (!session) return newState();
  const data = {};
  for (const col of ANSWER_COLUMNS) if (church?.[col] != null) data[col] = church[col];
  if (church?.consent_at) data.consent = true;
  return {
    phase: session.phase,
    lang: session.lang,
    queue: session.queue || [],
    editing: session.editing,
    data,
  };
}

async function save(phone, before, state, church) {
  const now = new Date().toISOString();
  // Complete from the first DONE until a restart, even while an answer is
  // being edited afterwards.
  let completed = church?.completed_at || null;
  if (state.phase === "done" && before.phase !== "done") completed = now;
  if (state.phase === "lang") completed = null;

  const row = { phone, lang: state.lang };
  for (const col of ANSWER_COLUMNS) row[col] = state.data[col] ?? null;
  row.consent_at = state.data.consent ? church?.consent_at || now : null;
  row.completed_at = completed;
  row.status = state.phase === "stopped" ? "opted_out" : completed ? "complete" : "in_progress";

  await Promise.all([
    db("btw_sessions?on_conflict=phone", {
      method: "POST",
      body: { phone, lang: state.lang, phase: state.phase, queue: state.queue, editing: state.editing },
      prefer: "resolution=merge-duplicates",
    }),
    db("btw_churches?on_conflict=phone", { method: "POST", body: row, prefer: "resolution=merge-duplicates" }),
  ]);
}

// Vercel's req.query only splits on "&"; voip.ms callbacks may use ";".
function parseQuery(url = "") {
  const qs = url.split("?")[1] || "";
  const out = {};
  for (const pair of qs.split(/[&;]/)) {
    if (!pair) continue;
    const [k, ...rest] = pair.split("=");
    out[decodeURIComponent(k)] = decodeURIComponent(rest.join("=").replace(/\+/g, " "));
  }
  return out;
}

// Handles a flat form/JSON body or a nested JSON webhook payload ({ data: { payload: {...} } }).
function flattenBody(body) {
  if (!body || typeof body !== "object") return {};
  const p = body.data?.payload || body.payload || body;
  const fields = {
    id: p.id,
    from: typeof p.from === "object" ? p.from?.phone_number : p.from,
    to: Array.isArray(p.to) ? p.to[0]?.phone_number : p.to,
    message: p.text ?? p.message,
    date: p.received_at ?? p.date,
    media: p.media,
  };
  // Drop missing fields so they don't overwrite values from the query string.
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null));
}

function normalize(raw) {
  const digits = (v) => String(v || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return {
    id: raw.id || null,
    from: digits(raw.from),
    to: digits(raw.to),
    message: raw.message || "",
    date: raw.date || null,
    media: Array.isArray(raw.media) ? raw.media.map((m) => m.url || m) : [],
  };
}
