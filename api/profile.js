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
//   PATCH ?key=...  { name, email, ... } -> { church } or 400 { error, field, message }
//                      where message is the explanation in their language
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
import { isProfileKey, linkText, newProfileKey, siteUrl } from "../lib/profile-link.js";
import { db, eq } from "../lib/supabase.js";
import { explainStatus, sendText } from "../lib/voipms.js";

const FIELDS = ["phone", "lang", "baptisms", "baptisms_at", "church_name", ...EDITABLE.filter((f) => f !== "church_name")].join(",");
// Prompts the page needs: labels, yes/no, the explanations for bad answers,
// and its own wording.
const TEXT_KEYS = [
  "sum_name", "sum_email", "sum_church", "sum_street", "sum_city", "sum_state", "sum_zip", "sum_denom",
  "sum_website", "sum_contact", "sum_baptism", "sum_map", "sum_country", "val_yes", "val_no", "err_postal",
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
  // The signup form (no key).
  "web_signup_intro", "web_language", "web_phone_signup_hint", "web_signup_consent", "web_signup_button",
  "web_signed_up", "web_phone_taken", "web_required", "web_phone_invalid",
];
// The front page's wording (public/index.html).
const LANDING_KEYS = ["web_title", "web_language", "web_phone", "web_phone_invalid",
  "land_intro", "land_church_title", "land_church_text", "land_signup", "land_text_us", "land_link_title",
  "land_link_hint", "land_link_button", "land_link_sent", "land_baptized_title", "land_baptized_text",
  "land_coming_soon", "land_team_title", "land_team_text", "land_team_button"];
// Get my link texts a number at most this often.
const LINK_EVERY_MS = 10 * 60 * 1000;
// Answers the signup form must have; state and ZIP only in the US.
const REQUIRED = ["church_name", "street", "city", "name", "email"];
const RTL = new Set(["ar", "ur"]);

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
    if (req.method === "POST" && params.get("part") === "link") return await sendLink(req.body || {}, res, siteUrl(req));
    if (req.method === "POST") return await signup(req.body || {}, res);
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
    if (req.method === "GET") {
      res.status(200).json({ church: publicFields(church), phone: formatPhone(church.phone), baptisms: church.baptisms, baptisms_at: church.baptisms_at,
        lang, dir: RTL.has(lang) ? "rtl" : "ltr", text: await wording(lang) });
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

    const body = Object.fromEntries(EDITABLE.filter((f) => req.body && f in req.body).map((f) => [f, req.body[f]]));
    const { fields, error, field, prompt } = cleanChurchFields(body);
    if (error) {
      const words = await wording(lang);
      res.status(400).json({ error, field, message: words[prompt || ERROR_PROMPTS[field]] || error });
      return;
    }
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

// Get my link (see POST ?part=link above).
async function sendLink(body, res, site) {
  const phone = phoneValue(body.phone);
  if (!phone) {
    const [language] = typeof body.lang === "string" ? await db(`btw_languages?code=${eq(body.lang)}&select=code`) : [];
    const words = await wording(language ? language.code : "en", ["web_phone_invalid"]);
    res.status(400).json({ error: "Enter the phone number you signed up with.", field: "phone", message: words.web_phone_invalid });
    return;
  }
  const since = new Date(Date.now() - LINK_EVERY_MS).toISOString();
  const [[church], [session], recent] = await Promise.all([
    db(`btw_churches?phone=${eq(phone)}&select=phone,lang,profile_key,simulated`),
    db(`btw_sessions?phone=${eq(phone)}&select=phase`),
    db(`btw_events?phone=${eq(phone)}&source=eq.get-link&created_at=gte.${encodeURIComponent(since)}&select=id&limit=1`),
  ]);
  if (church && !church.simulated && session?.phase !== "stopped" && !recent.length) {
    const text = await linkText(phone, church, church.lang || "en", site);
    let error = null;
    try {
      await sendText(phone.slice(2), text);
    } catch (err) {
      error = err.status ? explainStatus(err.status) : `Couldn't send: ${err.message}`;
    }
    // The text in their thread, and a note that also spaces out repeats.
    await Promise.all([
      db("btw_messages", { method: "POST", body: { phone, direction: "out", thread: "signup", body: text, error } }),
      logEvent(error ? "error" : "info", "get-link", error ? `Get my link wasn't sent: ${error}` : "Texted their page link (Get my link on the front page).", { phone }),
    ]);
  }
  res.status(200).json({ sent: true });
}

// A signup from the web form (see POST above).
async function signup(body, res) {
  const [language] = typeof body.lang === "string" ? await db(`btw_languages?code=${eq(body.lang)}&active=eq.true&select=code`) : [];
  const lang = language ? language.code : "en";
  const words = await wording(lang);
  const refuse = (status, field, prompt, error) => res.status(status).json({ error, field, message: words[prompt] || error });

  const phone = phoneValue(body.phone);
  if (!phone) return refuse(400, "phone", "web_phone_invalid", "Enter the phone number you text from.");
  const input = Object.fromEntries(EDITABLE.filter((f) => f in body).map((f) => [f, body[f]]));
  const { fields, error, field, prompt } = cleanChurchFields({ country: "US", ...input });
  if (error) return refuse(400, field, prompt || ERROR_PROMPTS[field], error);
  const us = fields.country === "US";
  const missing = [...REQUIRED, ...(us ? ["state", "zip"] : [])].find((f) => !fields[f])
    || ["baptism_same", "public_map"].find((f) => typeof fields[f] !== "boolean")
    || (fields.baptism_same === false && ["baptism_street", "baptism_city", ...(us ? ["baptism_state", "baptism_zip"] : [])].find((f) => !fields[f]));
  if (missing) return refuse(400, missing, "web_required", "This one is needed.");
  if (body.consent !== true) return refuse(400, "consent", "web_required", "Tick the box to sign up.");

  const [taken] = await db(`btw_churches?phone=${eq(phone)}&select=phone`);
  if (taken) return refuse(409, "phone", "web_phone_taken", "This number is already signed up. Text it to get your link.");

  const now = new Date().toISOString();
  const key = newProfileKey();
  await db("btw_churches", { method: "POST", body: { ...fields, phone, lang, status: "complete", completed_at: now, consent_at: now, profile_key: key } });
  await db("btw_sessions?on_conflict=phone", {
    method: "POST",
    body: { phone, lang, phase: "done", queue: [], editing: false },
    prefer: "resolution=merge-duplicates",
  });
  res.status(200).json({ key });
}

// The number as stored: +1 and 10 digits for the US and Canada, otherwise
// + and 8 to 15 digits when typed with a + (texts only come in from 10-digit
// numbers today; see docs/gaps.md).
function phoneValue(input) {
  const text = String(input || "").trim();
  const d = text.replace(/\D/g, "");
  if (text.startsWith("+") && !d.startsWith("1")) return d.length >= 8 && d.length <= 15 ? `+${d}` : null;
  if (d.length === 10) return `+1${d}`;
  if (d.length === 11 && d[0] === "1") return `+${d}`;
  return null;
}

// The answers the page can edit; the phone is sent apart, since it can't be
// changed (it's the signup's identity).
function publicFields(church) {
  const { phone, lang, baptisms, baptisms_at, ...rest } = church;
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

// `keys` in `lang`, English where a translation is missing.
async function wording(lang, keys = TEXT_KEYS) {
  const list = encodeURIComponent(`(${keys.join(",")})`);
  const langs = encodeURIComponent(`(${[...new Set(["en", lang])].join(",")})`);
  const rows = await db(`btw_prompts?key=in.${list}&lang=in.${langs}&select=key,lang,text`);
  const out = {};
  for (const r of rows) if (r.lang === "en" && !(r.key in out)) out[r.key] = r.text;
  for (const r of rows) if (r.lang === lang) out[r.key] = r.text;
  return out;
}
