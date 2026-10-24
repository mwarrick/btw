// /api/profile.js
// The pastor's own signup page (/p/<key>, public/profile.html). The key from
// the DONE message's link is the only login: it opens that one signup.
//
//   GET ?key=...    -> { church, phone, lang, dir, text }: the answers, the
//                      signup's phone (shown, not editable), plus the page's
//                      wording in the signup's language (English where a
//                      prompt is missing)
//   GET ?key=...&part=messages -> { messages: [{ mine, body, at, photos: [id] }] }: the
//                      conversation with this number, oldest first (the latest 300),
//                      both the signup texts and the team's; `mine` is theirs.
//                      Replies that failed to send are left out, and who on the
//                      team wrote is not shown. `photos` are the ids of the
//                      pictures that text brought (still kept), for #photo-<id>.
//   GET ?key=...&part=stories -> { stories: [{ first_name, body, submitted_at, updated_at }] }:
//                      baptism stories written for this church (api/story.js), newest first
//   PATCH ?key=...  { name, email, ... } -> { church } or 400 { error, field, message }
//                      where message is the explanation in their language
//   PATCH ?key=...  { partial: true, <changed answers> } -> { church }: an unfinished
//                      signup's answers, kept as they're entered (no consent, not finished)
//   PATCH ?key=...  { baptisms } -> { baptisms, baptisms_at }: their total so far
//                      (the Baptisms tab; texting a number does the same)
//
//   GET ?part=signup&lang=xx -> { languages: [{ code, name }], lang, dir, text }: no key;
//                      the site's front page (/) uses the same page as a signup form
//   GET ?part=landing&lang=xx -> { languages, lang, dir, text, number }: the front
//                      page's (/, public/index.html) wording, and the signup number
//                      to text, e.g. "+1 714-716-5116" (null when VOIPMS_DID isn't set)
//   POST ?part=link { phone, lang } -> { sent: true }: Get my link on the front
//                      page. When the number has a signup (not opted out, not
//                      simulated) it's texted its page link (login_link), at most
//                      once per 10 minutes; the answer is the same either way, so
//                      the page doesn't tell who has signed up.
//   POST { lang, phone, consent, name, ... } -> { key } or 400/409 { error, field, message }:
//                      a signup from that form. It's saved finished, as if texted
//                      to the end, with a `done` session, so a later text from the
//                      phone is handled like any finished signup's. The phone isn't
//                      verified: whoever types a number claims it (docs/gaps.md).
//
// Saving records edited_at with edited_by left empty, which /admin shows as
// "by the pastor". The texts in btw_messages are never changed.

import { EDITABLE, ERROR_PROMPTS, cleanChurchFields } from "../lib/church-fields.js";
import { logEvent } from "../lib/events.js";
import { isProfileKey, linkText, newProfileKey, profileUrl, siteUrl } from "../lib/profile-link.js";
import { db, eq } from "../lib/supabase.js";
import { RTL, phoneValue, wording as words } from "../lib/web-text.js";
import { journeysWithStatus } from "../lib/journeys.js";
import { explainStatus, sendText } from "../lib/voipms.js";
import { checkCode, looksLikeBot, newCode, record, textsLeft, visitor, withinLimits } from "../lib/web-guard.js";

const FIELDS = ["id", "phone", "lang", "completed_at", "consent_at", "profile_key", "simulated", "weekly_note", "baptisms", "baptisms_at", "church_name", ...EDITABLE.filter((f) => f !== "church_name")].join(",");
// The page's wording (TEXT_KEYS unless told otherwise).
const wording = (lang, keys = TEXT_KEYS) => words(lang, keys);
// Prompts the page needs: labels, yes/no, the explanations for bad answers,
// and its own wording.
const TEXT_KEYS = [
  "sum_name", "sum_email", "sum_church", "sum_street", "sum_city", "sum_state", "sum_zip", "sum_denom",
  "sum_website", "sum_contact", "sum_baptism", "sum_map", "sum_country", "web_region", "web_postal", "val_yes", "val_no", "err_postal",
  ...Object.values(ERROR_PROMPTS),
  "web_title", "web_intro", "web_save", "web_saved", "web_contact_hint", "web_contact_phone", "web_baptism_same", "web_bad_link",
  // The Photos tab (api/profile-photos.js).
  "web_tab_signup", "web_tab_photos", "web_photos_intro", "web_consent", "web_add_photos", "web_consent_needed",
  "web_uploading", "web_uploaded", "web_upload_failed", "web_delete", "web_delete_confirm", "web_no_photos", "web_photos_temporary",
  // The Resources tab: a button to the organizer's folder (resources_url).
  "resources_url", "web_tab_resources", "web_resources_intro", "web_resources_open",
  "web_waiting_label", "web_not_shared_label",
  // The church's sharing choice.
  "web_opt_in", "web_opt_out", "web_opted_in", "web_opt_out_confirm",
  // The conversation under the signup form.
  "web_messages_title", "web_from_us", "web_from_you", "web_photo_link", "web_no_messages",
  // The Baptisms tab.
  "web_tab_baptisms", "web_baptisms_question", "web_baptisms_hint", "web_baptisms_updated", "web_baptisms_invalid",
  "web_phone", "web_phone_hint",
  // Finishing a signup begun by text (web_form_link).
  "web_finish_intro", "web_finish_button",
  // The Newly baptized tab: people on their first 30 days (api/journey.js).
  "web_tab_journeys", "web_journeys_intro", "web_no_journeys", "web_journey_progress", "web_journey_flag",
  "web_journey_talked", "web_journey_next_label", "web_weekly_note", "web_weekly_note_hint",
  "j_good", "j_hard", "j_ask", "j_next_group", "j_next_serve", "j_next_class", "j_next_unsure", "j_day",
  // The Stories tab: baptism stories from the church's people (api/story.js).
  "web_tab_stories", "web_stories_intro", "web_no_stories",
  // The signup form (no key).
  "web_signup_intro", "web_language", "web_phone_signup_hint", "web_signup_consent", "web_signup_button",
  "web_signed_up", "web_phone_taken", "web_required", "web_phone_invalid",
  // Its phone check (lib/web-guard.js).
  "web_code_label", "web_code_button", "web_code_resend", "web_code_wrong", "web_code_expired", "web_wait", "web_busy",
];
// The front page's wording (public/index.html).
const LANDING_KEYS = ["web_title", "web_language", "web_phone", "web_phone_invalid",
  "land_intro", "land_church_title", "land_church_text", "land_signup", "land_text_us", "land_link_title",
  "land_link_hint", "land_link_button", "land_link_sent", "land_baptized_title", "land_baptized_text",
  "land_coming_soon", "land_baptized_button", "land_journey_button", "land_team_title", "land_team_text", "land_team_button"];
// Answers the signup form must have; state and ZIP only in the US.
const REQUIRED = ["church_name", "street", "city", "name", "email"];

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "PATCH", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, PATCH, POST");
    res.status(405).json({ error: "Use GET, PATCH or POST." });
    return;
  }
  try {
    const params = new URL(req.url, "http://x").searchParams;
    if (req.method === "GET" && params.get("part") === "signup") return await signupForm(params.get("lang"), res);
    if (req.method === "GET" && params.get("part") === "landing") return await signupForm(params.get("lang"), res, LANDING_KEYS);
    if (req.method === "POST" && params.get("part") === "link") return await sendLink(req, req.body || {}, res, siteUrl(req));
    if (req.method === "POST") return await signup(req, req.body || {}, res, siteUrl(req));
    const key = new URL(req.url, "http://x").searchParams.get("key");
    const [church] = isProfileKey(key) ? await db(`btw_churches?profile_key=${eq(key)}&select=${FIELDS}`) : [];
    if (!church) {
      // The page still needs words for "this link doesn't work".
      res.status(404).json({ error: "not_found", text: await wording("en") });
      return;
    }
    const lang = church.lang || "en";

    if (req.method === "GET" && new URL(req.url, "http://x").searchParams.get("part") === "messages") {
      res.status(200).json({ messages: await history(church.phone) });
      return;
    }
    if (req.method === "GET" && new URL(req.url, "http://x").searchParams.get("part") === "journeys") {
      const list = await journeysWithStatus([church.id]);
      res.status(200).json({
        weekly_note: church.weekly_note || "",
        journeys: list.sort((a, b) => (!!b.flag - !!a.flag) || b.id - a.id).map((j) => ({
          id: j.id, first_name: j.first_name, day: j.day, done: j.done, finished: j.finished, next_step: j.next_step,
          checkins: j.checkins, flag: j.flag, phone: j.contact_ok && j.phone ? formatPhone(j.phone) : null, started_on: j.started_on,
        })),
      });
      return;
    }
    if (req.method === "GET" && new URL(req.url, "http://x").searchParams.get("part") === "stories") {
      const stories = await db(`btw_testimonies?church_id=eq.${church.id}&submitted_at=not.is.null&select=first_name,body,submitted_at,updated_at&order=submitted_at.desc`);
      res.status(200).json({ stories: stories.filter((s) => s.submitted_at) });
      return;
    }
    if (req.method === "GET") {
      res.status(200).json({ church: publicFields(church), phone: formatPhone(church.phone), completed: !!church.completed_at,
        baptisms: church.baptisms, baptisms_at: church.baptisms_at,
        lang, dir: RTL.has(lang) ? "rtl" : "ltr", text: await wording(lang) });
      return;
    }

    // Newly baptized tab: We talked clears someone's flag; the weekly note
    // shows on every day's page of their first 30 days.
    if (req.body && "journey_talked" in req.body) {
      const id = Number(req.body.journey_talked);
      await db(`btw_journeys?id=eq.${Number.isInteger(id) ? id : 0}&church_id=eq.${church.id}`, { method: "PATCH", body: { talked_at: new Date().toISOString() } });
      res.status(200).json({ ok: true });
      return;
    }
    if (req.body && "weekly_note" in req.body) {
      const note = String(req.body.weekly_note ?? "").trim().replace(/\s+/g, " ").slice(0, 200) || null;
      await db(`btw_churches?id=eq.${church.id}`, { method: "PATCH", body: { weekly_note: note } });
      res.status(200).json({ weekly_note: note || "" });
      return;
    }
    if (req.body && "baptisms" in req.body) {
      const n = Number(req.body.baptisms);
      if (!Number.isInteger(n) || n < 0 || n > 100000) {
        const words = await wording(lang);
        res.status(400).json({ error: "Enter a whole number.", field: "baptisms", message: words.web_baptisms_invalid || "Enter a whole number." });
        return;
      }
      const [saved] = await db(`btw_churches?profile_key=${eq(key)}&select=baptisms,baptisms_at`, {
        method: "PATCH",
        body: { baptisms: n, baptisms_at: new Date().toISOString() },
        prefer: "return=representation",
      });
      res.status(200).json(saved);
      return;
    }

    // The page sends only the answers changed on it: the rest keep their
    // latest value, which may have come by text since the page opened (the
    // last entry, by web or by text, is the one that counts). The saved
    // country still decides how a changed state or ZIP is checked.
    const body = Object.fromEntries(EDITABLE.filter((f) => req.body && f in req.body).map((f) => [f, req.body[f]]));
    const { fields, error, field, prompt } = cleanChurchFields({ country: church.country ?? null, ...body });
    if (error) {
      const words = await wording(lang);
      res.status(400).json({ error, field, message: words[prompt || ERROR_PROMPTS[field]] || error });
      return;
    }
    // A signup still being answered by text (opened from web_form_link) is
    // finished here: every answer and the consent, like the signup form.
    if (!church.completed_at && !req.body?.partial) return await finish(church, fields, req.body || {}, res, siteUrl(req));
    // Otherwise each answer is kept as it's entered on the page (partial, while
    // a signup is unfinished, so nothing is lost if the connection drops and
    // they carry on by text), or saved with Save once it's finished.
    const [saved] = await db(`btw_churches?profile_key=${eq(key)}&select=${FIELDS}`, {
      method: "PATCH",
      body: { ...fields, edited_by: null, edited_at: new Date().toISOString() },
      prefer: "return=representation",
    });
    res.status(200).json({ church: publicFields(saved) });
  } catch (err) {
    console.error("profile:", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}

// Switched-on languages, by their own names, and the form's wording.
// (The front page uses it too, with its own wording and the number to text.)
async function signupForm(wanted, res, keys = TEXT_KEYS) {
  const languages = await db("btw_languages?active=eq.true&select=code,name,menu_label&order=menu_order");
  const lang = languages.some((l) => l.code === wanted) ? wanted : "en";
  const did = (process.env.VOIPMS_DID || "").replace(/\D/g, "").slice(-10);
  res.status(200).json({ languages: languages.map((l) => ({ code: l.code, name: l.menu_label || l.name })),
    lang, dir: RTL.has(lang) ? "rtl" : "ltr", text: await wording(lang, keys),
    ...(keys === LANDING_KEYS ? { number: did.length === 10 ? `+1 ${did.slice(0, 3)}-${did.slice(3, 6)}-${did.slice(6)}` : null } : {}) });
}

// Get my link (see POST ?part=link above). Bots, and numbers or visitors
// over their limits, get the same answer and nothing is sent.
async function sendLink(req, body, res, site) {
  const phone = phoneValue(body.phone);
  if (!phone) {
    const [language] = typeof body.lang === "string" ? await db(`btw_languages?code=${eq(body.lang)}&select=code`) : [];
    const words = await wording(language ? language.code : "en", ["web_phone_invalid"]);
    res.status(400).json({ error: "Enter the phone number you signed up with.", field: "phone", message: words.web_phone_invalid });
    return;
  }
  const ip = visitor(req);
  if (looksLikeBot(body)) {
    await record("bot", ip, phone);
    res.status(200).json({ sent: true });
    return;
  }
  const [[church], [session]] = await Promise.all([
    db(`btw_churches?phone=${eq(phone)}&select=phone,lang,profile_key,simulated`),
    db(`btw_sessions?phone=${eq(phone)}&select=phase`),
  ]);
  if (church && !church.simulated && session?.phase !== "stopped" && (await withinLimits("link", ip, phone)) && (await textsLeft())) {
    await record("link", ip, phone);
    const text = await linkText(phone, church, church.lang || "en", site);
    const error = await send(phone, text);
    await Promise.all([
      db("btw_messages", { method: "POST", body: { phone, direction: "out", thread: "signup", body: text, error } }),
      logEvent(error ? "error" : "info", "get-link", error ? `Get my link wasn't sent: ${error}` : "Texted their page link (Get my link on the front page).", { phone }),
    ]);
  }
  res.status(200).json({ sent: true });
}

// Sends one text; returns null, or why it failed.
async function send(phone, text) {
  try {
    await sendText(phone.slice(2), text);
    return null;
  } catch (err) {
    return err.status ? explainStatus(err.status) : `Couldn't send: ${err.message}`;
  }
}

// A signup from the web form (see POST above), in two steps: the answers are
// checked and a code is texted to the phone (202 { needCode }); the same
// answers sent again with { code } save the signup and text the thank-you
// with their page link, as a signup by text gets. { resend: true } texts a
// new code. Bots get a 202 and nothing is sent or saved.
async function signup(req, body, res, site) {
  const [language] = typeof body.lang === "string" ? await db(`btw_languages?code=${eq(body.lang)}&active=eq.true&select=code`) : [];
  const lang = language ? language.code : "en";
  const words = await wording(lang, [...TEXT_KEYS, "web_code_text", "done", "done_link"]);
  const refuse = (status, field, prompt, error) => res.status(status).json({ error, field, message: words[prompt] || error });
  const ip = visitor(req);

  const phone = phoneValue(body.phone);
  if (!phone) return refuse(400, "phone", "web_phone_invalid", "Enter a US or Canadian mobile number with its area code.");
  const input = Object.fromEntries(EDITABLE.filter((f) => f in body).map((f) => [f, body[f]]));
  const { fields, error, field, prompt } = cleanChurchFields({ country: "US", ...input });
  if (error) return refuse(400, field, prompt || ERROR_PROMPTS[field], error);
  const missing = missingAnswer(fields);
  if (missing) return refuse(400, missing, "web_required", "This one is needed.");
  if (body.consent !== true) return refuse(400, "consent", "web_required", "Tick the box to sign up.");

  const [taken] = await db(`btw_churches?phone=${eq(phone)}&select=phone`);
  if (taken) return refuse(409, "phone", "web_phone_taken", "This number is already signed up. Text it to get your link.");

  if (looksLikeBot(body)) {
    await record("bot", ip, phone);
    return res.status(202).json({ needCode: true });
  }

  // Step 1 (or a new code): text the code.
  if (!body.code || body.resend) {
    if (!(await withinLimits("code", ip, phone))) return refuse(429, body.resend ? "code" : null, "web_wait", "Too many tries. Please wait a few minutes and try again.");
    if (!(await textsLeft())) return refuse(503, null, "web_busy", "We can't send texts right now. Please try again later.");
    await record("code", ip, phone);
    const code = await newCode(phone);
    const template = words.web_code_text || "Your Baptize 2027 code is {code}.";
    const failed = await send(phone, template.includes("{code}") ? template.replace("{code}", code) : `${template} ${code}`);
    if (failed) {
      await logEvent("error", "web-signup", `The signup form's code wasn't sent: ${failed}`, { phone });
      return refuse(502, null, "web_busy", "We couldn't text that number. Check it, or try again later.");
    }
    return res.status(202).json({ needCode: true });
  }

  // Step 2: the code.
  const check = await checkCode(phone, body.code);
  if (check === "wrong") return refuse(400, "code", "web_code_wrong", "That code isn't right. Check the text and try again.");
  if (check !== "ok") return refuse(400, "code", "web_code_expired", "That code has expired. Send a new one.");

  const now = new Date().toISOString();
  const key = newProfileKey();
  await db("btw_churches", { method: "POST", body: { ...fields, phone, lang, status: "complete", completed_at: now, consent_at: now, profile_key: key } });
  await db("btw_sessions?on_conflict=phone", {
    method: "POST",
    body: { phone, lang, phase: "done", queue: [], editing: false },
    prefer: "resolution=merge-duplicates",
  });
  // The thank-you doesn't wait on the daily cap: the number was just verified.
  await record("welcome", ip, phone);
  await sendThanks(phone, words, profileUrl(site, key));
  res.status(200).json({ key });
}

// Finishes a signup begun by text: the answers so far plus the page's, the
// consent, then the church is complete and the session done (the text
// questions stop; later texts are handled like any finished signup's), and
// the usual thank-you with the page link is texted.
async function finish(church, fields, body, res, site) {
  const lang = church.lang || "en";
  const words = await wording(lang, [...TEXT_KEYS, "done", "done_link"]);
  const refuse = (field, error) => res.status(400).json({ error, field, message: words.web_required || error });
  const answers = { ...church, ...fields };
  const missing = missingAnswer(answers);
  if (missing) return refuse(missing, "This one is needed.");
  if (body.consent !== true) return refuse("consent", "Tick the box to finish your signup.");

  const now = new Date().toISOString();
  const [[saved], [session]] = await Promise.all([
    db(`btw_churches?id=eq.${church.id}&select=${FIELDS}`, {
      method: "PATCH",
      body: { ...fields, status: "complete", completed_at: now, consent_at: church.consent_at || now, edited_by: null, edited_at: now },
      prefer: "return=representation",
    }),
    db(`btw_sessions?phone=${eq(church.phone)}&select=phase`),
  ]);
  const stopped = session?.phase === "stopped";
  if (!stopped) {
    await db("btw_sessions?on_conflict=phone", {
      method: "POST",
      body: { phone: church.phone, lang, phase: "done", queue: [], editing: false },
      prefer: "resolution=merge-duplicates",
    });
    // Simulated numbers are fictional: nothing is texted.
    if (!church.simulated) await sendThanks(church.phone, words, profileUrl(site, saved.profile_key || ""));
  }
  res.status(200).json({ church: publicFields(saved), completed: true });
}

// The first answer a finished signup still lacks (the web forms' rule; by
// text, SKIP leaves the optional ones out): null when it has them all.
function missingAnswer(fields) {
  const us = !fields.country || fields.country === "US";
  return [...REQUIRED, ...(us ? ["state", "zip"] : [])].find((f) => !fields[f])
    || ["baptism_same", "public_map"].find((f) => typeof fields[f] !== "boolean")
    || (fields.baptism_same === false && ["baptism_street", "baptism_city", ...(us ? ["baptism_state", "baptism_zip"] : [])].find((f) => !fields[f]))
    || null;
}

// The thank-you a signup by text ends with (done and the page link), texted
// and kept in their conversation.
async function sendThanks(phone, words, link) {
  const linkLine = (words.done_link || "").includes("{link}") ? words.done_link.replace("{link}", link) : link;
  const thanks = [words.done, linkLine].filter(Boolean).join("\n");
  const failed = await send(phone, thanks);
  await db("btw_messages", { method: "POST", body: { phone, direction: "out", thread: "signup", body: thanks, error: failed } });
  if (failed) await logEvent("error", "web-signup", `The thank-you after finishing on the web wasn't sent: ${failed}`, { phone });
}

// The answers the page can edit; the phone is sent apart, since it can't be
// changed (it's the signup's identity).
function publicFields(church) {
  const { id, phone, lang, completed_at, consent_at, profile_key, simulated, weekly_note, baptisms, baptisms_at, ...rest } = church;
  return rest;
}

// Their conversation for the page (see GET ...&part=messages above).
async function history(phone) {
  const [rows, photos] = await Promise.all([
    db(`btw_messages?phone=${eq(phone)}&error=is.null&select=id,direction,body,created_at&order=id.desc&limit=300`),
    db(`btw_photos?phone=${eq(phone)}&message_id=not.is.null&select=id,message_id&order=id`),
  ]);
  const byMessage = new Map();
  for (const p of photos) byMessage.set(p.message_id, [...(byMessage.get(p.message_id) || []), p.id]);
  // Fetched newest first so a long thread keeps its latest texts; shown oldest first.
  return rows.sort((a, b) => a.id - b.id).map((m) => ({ mine: m.direction === "in", body: m.body || "", at: m.created_at, photos: byMessage.get(m.id) || [] }));
}

// +17145550100 -> (714) 555-0100
function formatPhone(phone) {
  const d = String(phone || "").replace(/^\+1/, "");
  return /^\d{10}$/.test(d) ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : phone;
}
