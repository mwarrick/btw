// /api/profile.js
// The pastor's own signup page (/p/<key>, public/profile.html). The key from
// the DONE message's link is the only login: it opens that one signup.
//
//   GET ?key=...    -> { church, phone, lang, dir, text }: the answers, the
//                      signup's phone (shown, not editable), plus the page's
//                      wording in the signup's language (English where a
//                      prompt is missing)
//   PATCH ?key=...  { name, email, ... } -> { church } or 400 { error, field, message }
//                      where message is the explanation in their language
//   PATCH ?key=...  { baptisms } -> { baptisms, baptisms_at }: their total so far
//                      (the Baptisms tab; texting a number does the same)
//
// Saving records edited_at with edited_by left empty, which /admin shows as
// "by the pastor". The texts in btw_messages are never changed.

import { EDITABLE, ERROR_PROMPTS, cleanChurchFields } from "../lib/church-fields.js";
import { isProfileKey } from "../lib/profile-link.js";
import { db, eq } from "../lib/supabase.js";

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
  // The Baptisms tab.
  "web_tab_baptisms", "web_baptisms_question", "web_baptisms_hint", "web_baptisms_updated", "web_baptisms_invalid",
  "web_phone", "web_phone_hint",
];
const RTL = new Set(["ar", "ur"]);

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" && req.method !== "PATCH") {
    res.setHeader("Allow", "GET, PATCH");
    res.status(405).json({ error: "Use GET or PATCH." });
    return;
  }
  try {
    const key = new URL(req.url, "http://x").searchParams.get("key");
    const [church] = isProfileKey(key) ? await db(`btw_churches?profile_key=${eq(key)}&select=${FIELDS}`) : [];
    if (!church) {
      // The page still needs words for "this link doesn't work".
      res.status(404).json({ error: "not_found", text: await wording("en") });
      return;
    }
    const lang = church.lang || "en";

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

// The answers the page can edit; the phone is sent apart, since it can't be
// changed (it's the signup's identity).
function publicFields(church) {
  const { phone, lang, baptisms, baptisms_at, ...rest } = church;
  return rest;
}

// +17145550100 -> (714) 555-0100
function formatPhone(phone) {
  const d = String(phone || "").replace(/^\+1/, "");
  return /^\d{10}$/.test(d) ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : phone;
}

// TEXT_KEYS in `lang`, English where a translation is missing.
async function wording(lang) {
  const list = encodeURIComponent(`(${TEXT_KEYS.join(",")})`);
  const langs = encodeURIComponent(`(${[...new Set(["en", lang])].join(",")})`);
  const rows = await db(`btw_prompts?key=in.${list}&lang=in.${langs}&select=key,lang,text`);
  const out = {};
  for (const r of rows) if (r.lang === "en" && !(r.key in out)) out[r.key] = r.text;
  for (const r of rows) if (r.lang === lang) out[r.key] = r.text;
  return out;
}
