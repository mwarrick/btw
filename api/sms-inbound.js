// /api/sms-inbound.js
// Receives incoming texts from voip.ms (the DID's "SMS URL Callback") and
// runs the signup conversation: every text to the number starts or carries
// on that number's signup, with no keyword needed. A new number's first
// text picks the language when Google can tell what it's written in. Once a
// signup is finished, texts that aren't commands go to the reviewers' team
// thread in /admin instead of the bot.
//
// Set the callback on the DID in the voip.ms portal to:
//   https://<your-site>/api/sms-inbound?key=<SMS_INBOUND_KEY>&to={TO}&from={FROM}&message={MESSAGE}&id={ID}&date={TIMESTAMP}&media={MEDIA}
// and enable "URL callback retry" so voip.ms resends until it gets "ok".
// {MEDIA} is an MMS's attachments, a comma-separated list of links; keep it
// last, since everything after media= is read as the list (a link may
// itself contain & or ;).
//
// Pictures: the links are kept with the text (btw_messages.media) and each
// picture is copied into our storage (lib/photos.js), shown on the pastor's
// page and in /admin. They may be shared publicly, so permission is asked by
// text (photo_ask) once the signup is finished: with the first picture of a
// batch, or right after finishing for pictures sent while signing up. A YES
// or NO to it, while photos are waiting, answers for all of them
// (photo_yes / photo_no, with the page link) and is the church's sharing
// choice (btw_churches.photos_allowed, also Opt in / Opt out on the page);
// once it has chosen, new photos follow it and the question isn't asked.
// A picture with no words while a signup question is open gets that
// question again; after finishing, its
// message also goes to the team thread like any text, and each picture gets
// a receipt (photo_received / photos_received) linking to it on their page.
//
// After finishing, a text that's only a number is the church's baptism
// count (btw_churches.baptisms, the latest wins; count_saved). Any other
// text the bot doesn't understand goes to the team thread and also gets
// info_reply (what they can send), at most once a day.
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
import { loadPrompts, straighten } from "../lib/prompts.js";
import { db, eq } from "../lib/supabase.js";
import { logEvent } from "../lib/events.js";
import { churchChoice, pendingPhotos, savePhotosFromText, setPhotoChoice } from "../lib/photos.js";
import { newProfileKey, profileUrl, siteUrl } from "../lib/profile-link.js";
import { detect, translate } from "../lib/translate.js";
import { explainStatus, sendText } from "../lib/voipms.js";

// info_reply goes out at most once in this long.
const INFO_EVERY_MS = 24 * 60 * 60 * 1000;

// A first text is only trusted to name a language when Google is at least
// this sure and it has this many letters; "hi" or "ok" gets the menu.
const DETECT_CONFIDENCE = 0.8;
const DETECT_MIN_LETTERS = 4;

// btw_churches columns the engine keeps in state.data under the same name.
const ANSWER_COLUMNS = [
  "name", "email", "church_name", "country", "street", "city", "state", "zip",
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

  // Short codes (e.g. WhatsApp's verification codes from 29283) and other
  // non-US/Canada senders: never answered, but shown in the Log panel so the
  // team can read them.
  if (sms.from.length !== 10) {
    await logEvent("info", "short-code", `Text from ${sms.from}, not answered: ${sms.message || "(no words)"}`,
      { detail: { from: sms.from, to: sms.to, id: sms.id, media: sms.media } });
    res.status(200).send("ok");
    return;
  }

  try {
    await converse(sms, siteUrl(req));
    res.status(200).send("ok");
  } catch (err) {
    // Anything but "ok" makes voip.ms retry later.
    await logEvent("error", "sms-inbound", `Couldn't handle an incoming text; voip.ms will retry it. ${err.message}`,
      { phone: "+1" + sms.from, detail: { message: sms.message } });
    res.status(500).send("error");
  }
}

async function converse(sms, site) {
  const phone = "+1" + sms.from;

  const [logged] = await db("btw_messages?on_conflict=provider_id", {
    method: "POST",
    body: { provider_id: sms.id, phone, direction: "in", body: sms.message, media: sms.media.length ? sms.media : null },
    prefer: "resolution=ignore-duplicates,return=representation",
  });
  if (!logged) return; // a retry of a text already handled

  let replies = [];
  let engine, lang, link, finished = false, stopped = false, justFinished = false;
  try {
    const [[session], [church], { languages, prompts }] = await Promise.all([
      db(`btw_sessions?phone=${eq(phone)}&select=*`),
      db(`btw_churches?phone=${eq(phone)}&select=*`),
      loadPrompts(),
    ]);
    // Someone who only wrote a baptism story (api/story.js) isn't signing up
    // a church: their text is kept and shown in the Log panel, unanswered.
    if (!session && !church) {
      const [writer] = await db(`btw_testimonies?phone=${eq(phone)}&select=id`);
      if (writer) {
        await logEvent("info", "story", `Text from someone who wrote a baptism story, not answered: ${sms.message || "(no words)"}`, { phone });
        return;
      }
    }
    engine = createEngine({ prompts, languages });
    const before = toState(session, church);
    // Answers given on their page since the last text: questions further on
    // that are answered there aren't asked by text. The one on their phone
    // (the head of the queue) still is: their reply answers it, and the latest
    // entry, by web or by text, is the one that counts.
    if (before.phase === "collect" && before.queue.length > 1) {
      before.queue = [before.queue[0], ...before.queue.slice(1).filter((q) => !answeredOnPage(q, before.data))];
    }
    lang = before.lang || church?.lang || "en";
    // The pastor's own page, linked from the DONE message; the key is kept
    // once the signup is complete.
    const key = church?.profile_key || newProfileKey();
    link = profileUrl(site, key);
    finished = !!church?.completed_at;
    stopped = before.phase === "stopped";
    const pictureOnly = !sms.message.trim() && sms.media.length > 0;
    // YES or NO, after finishing, while texted photos wait for permission.
    const permission = before.phase === "done" && !sms.media.length ? engine.yesNo(lang, sms.message) : null;

    if (permission !== null && (await pendingPhotos(phone)).length) {
      // Their answer is the church's choice, as Opt in / Opt out on the page.
      await setPhotoChoice(phone, permission, `${engine.say(lang, "photo_ask")}\n→ ${sms.message.trim()}`);
      replies = [engine.say(lang, permission ? "photo_yes" : "photo_no", { link: `${link}#photos` })];
    } else if (pictureOnly && ["collect", "lang", "summary"].includes(before.phase) && session) {
      // Just a picture while a question is open (signing up, or changing an
      // answer): keep it, and ask the question again.
      replies = engine.again(before);
    } else {
      // A new number's first text starts the signup in the language it's
      // written in when that's clear, or with the language menu otherwise;
      // only an opt-out word is taken at its word.
      let result = engine.reply(before, sms.message, { link });
      if (!session && result.state.phase !== "stopped") {
        const detected = await guessLanguage(sms.message, languages, phone);
        result = detected ? engine.startIn(detected) : engine.start();
      }
      // Once the signup has been finished (even if an answer is being changed
      // since), anything that isn't a command is for the reviewers: it joins
      // the team thread in /admin, and the bot stays quiet.
      const count = finished && result.unhandled ? baptismCount(sms.message) : null;
      if (count !== null) {
        await db(`btw_churches?phone=${eq(phone)}`, { method: "PATCH", body: { baptisms: count, baptisms_at: new Date().toISOString() } });
        replies = [engine.say(lang, "count_saved", { count })];
      } else if (finished && result.unhandled) {
        await toTeam(logged, phone);
        // Pictures get their own receipt below.
        if (!sms.media.length && !(await infoSentRecently(phone, engine.say(lang, "info_reply")))) {
          replies = [engine.say(lang, "info_reply")];
        }
      } else {
        // Right after the language is picked, the first time: their own page
        // as another way to answer (web_form_link), between the welcome and
        // the first question. Saving the key makes the link work from now on.
        const offerForm = !finished && before.phase === "lang" && result.state.phase === "collect" && !church?.profile_key;
        await save(phone, before, result.state, church, key, offerForm);
        replies = result.replies;
        if (offerForm) {
          const form = engine.say(result.state.lang, "web_form_link", { link });
          if (form && form.includes(link)) replies = [...replies.slice(0, -1), form, ...replies.slice(-1)];
        }
        lang = result.state.lang || lang;
        stopped = result.state.phase === "stopped";
        justFinished = !finished && result.state.phase === "done";
        finished = finished || justFinished;
      }
    }
  } catch (err) {
    // Forget the text so voip.ms's retry runs it again.
    await db(`btw_messages?id=eq.${logged.id}`, { method: "DELETE" }).catch(() => {});
    throw err;
  }

  // Pictures go into storage (after the text is handled, so a retry can't
  // copy them twice), following the church's sharing choice. While it hasn't
  // chosen, once the signup is finished, the first picture of a batch, or
  // finishing with pictures already waiting, brings the permission question.
  if (sms.media.length || justFinished) {
    try {
      const waiting = (await pendingPhotos(phone)).length;
      const choice = await churchChoice(phone);
      let saved = 0;
      if (sms.media.length) {
        const out = await savePhotosFromText({ phone, messageId: logged.id, urls: sms.media, choice });
        saved = out.saved;
        if (out.skipped.length) {
          await logEvent("warning", "sms-inbound", `Some of a text's attachments weren't kept as photos: ${out.skipped.join("; ")}`, { phone });
        }
        // A receipt linking to the photo (or, for several, the Photos tab).
        if (saved && finished && !stopped && !justFinished) {
          replies.push(saved === 1
            ? engine.say(lang, "photo_received", { link: `${link}#photo-${out.ids[0]}` })
            : engine.say(lang, "photos_received", { link: `${link}#photos` }));
        }
      }
      if (choice.allowed === null && finished && !stopped && ((saved && !waiting) || (justFinished && waiting))) {
        replies.push(engine.say(lang, "photo_ask"));
      }
    } catch (err) {
      await logEvent("error", "sms-inbound", `Couldn't keep a text's photos: ${err.message}`, { phone });
    }
  }

  // A prompt missing in the database would send nothing (voip.ms refuses an
  // empty text); say so in the Log instead.
  if (replies.some((r) => !r?.trim())) {
    await logEvent("error", "sms-inbound", "A reply came out empty, so it wasn't sent. A prompt is probably missing in btw_prompts.", { phone });
    replies = replies.filter((r) => r?.trim());
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

// A text that's only a number (any script's digits, with spaces, commas or
// dots between thousands), as a count from 0 to 100000; null otherwise.
function baptismCount(text) {
  const t = String(text || "").trim().replace(/[.!。]$/, "");
  if (!/^\p{Nd}[\p{Nd}\s,.]*$/u.test(t)) return null;
  const digits = [...t].filter((c) => /\p{Nd}/u.test(c)).map((c) => {
    const code = c.codePointAt(0);
    // Each script's digits run 0-9 in a row, so the value is the distance from its zero.
    for (let zero = code; zero >= code - 9; zero--) if (!/\p{Nd}/u.test(String.fromCodePoint(zero - 1)) || zero === code - 9) return code - zero;
    return 0;
  }).join("");
  const n = Number(digits);
  return digits.length <= 6 && n <= 100000 ? n : null;
}

// Whether info_reply already went to this number in the last day.
async function infoSentRecently(phone, text) {
  const since = new Date(Date.now() - INFO_EVERY_MS).toISOString();
  const rows = await db(`btw_messages?phone=${eq(phone)}&direction=eq.out&created_at=gte.${encodeURIComponent(since)}&body=${eq(text)}&select=id&limit=1`);
  return rows.length > 0;
}

// Moves an incoming text to the team thread, unread, with an English
// translation when it isn't in English. A failed translation only costs
// the translation.
async function toTeam(message, phone) {
  let translation = null;
  // A picture with no words has nothing to translate.
  if (message.body.trim()) try {
    const [english] = await translate([message.body], "en", null);
    // Google's copy has straight quotes (see lib/translate.js), so compare
    // that way: "that’s right" typed on a phone isn't a translation.
    const same = (t) => straighten(t).replace(/\s+/g, " ").trim().toLowerCase();
    if (same(english) !== same(message.body)) translation = english;
  } catch (err) {
    await logEvent("warning", "sms-inbound", `Couldn't translate a message for the team: ${err.message}`, { phone });
  }
  await db(`btw_messages?id=eq.${message.id}`, { method: "PATCH", body: { thread: "team", translation } });
}

// The switched-on language a first text is written in, or null when it's
// unclear, not switched on, or detection fails (the menu then decides).
async function guessLanguage(message, languages, phone) {
  if ((message.match(/\p{L}/gu) || []).length < DETECT_MIN_LETTERS) return null;
  try {
    const { lang, confidence } = await detect(message);
    console.log("Detected language", JSON.stringify({ lang, confidence }));
    if (confidence < DETECT_CONFIDENCE) return null;
    return languages.some((l) => l.code === lang) ? lang : null;
  } catch (err) {
    await logEvent("warning", "sms-inbound", `Couldn't detect the language of a first text, so it got the menu: ${err.message}`, { phone });
    return null;
  }
}

// Which answer each text question fills (consent is only given by text or
// by finishing on the page).
const QUESTION_COLUMN = {
  name: "name", email: "email", church: "church_name", country: "country", street: "street", city: "city",
  state: "state", zip: "zip", denom: "denomination", website: "website", contact: "contact_name",
  contact_phone: "contact_phone", map: "public_map", b_street: "baptism_street", b_city: "baptism_city",
  b_state: "baptism_state", b_zip: "baptism_zip",
};
function answeredOnPage(question, data) {
  const has = (col) => data[col] != null && data[col] !== "";
  // "Somewhere else" only counts once that place is filled in too, since
  // its questions follow from this one.
  if (question === "baptism") {
    return data.baptism_same === true || (data.baptism_same === false && ["baptism_street", "baptism_city"].every(has));
  }
  return QUESTION_COLUMN[question] ? has(QUESTION_COLUMN[question]) : false;
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

async function save(phone, before, state, church, key, keepKey = false) {
  const now = new Date().toISOString();
  // Complete from the first DONE until a restart, even while an answer is
  // being edited or the language changed afterwards.
  let completed = church?.completed_at || null;
  if (state.phase === "done" && before.phase !== "done") completed = now;
  if (state.phase === "lang" && !Object.keys(state.data).length) completed = null;

  const row = { phone, lang: state.lang };
  for (const col of ANSWER_COLUMNS) row[col] = state.data[col] ?? null;
  row.consent_at = state.data.consent ? church?.consent_at || now : null;
  row.completed_at = completed;
  row.status = state.phase === "stopped" ? "opted_out" : completed ? "complete" : "in_progress";
  if (completed || keepKey) row.profile_key = key;

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
// media= is last in the callback URL and taken whole, since its links may
// contain & or ; themselves.
function parseQuery(url = "") {
  let qs = url.slice(url.indexOf("?") + 1 || url.length);
  const out = {};
  const m = qs.match(/(^|[&;])media=/);
  if (m) {
    out.media = decodeURIComponent(qs.slice(m.index + m[0].length).replace(/\+/g, " "));
    qs = qs.slice(0, m.index);
  }
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
    // A JSON body's list, or the callback's comma-separated links.
    media: (Array.isArray(raw.media) ? raw.media.map((m) => m.url || m) : String(raw.media || "").split(","))
      .map((u) => String(u).trim()).filter((u) => /^https?:\/\//i.test(u)).slice(0, 10),
  };
}
