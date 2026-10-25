// /api/story.js
// Baptism testimonies (public/story.html at /story and /s/<key>). A baptized
// person picks a language and their church, types their phone, and is texted
// a private link; the link is the only login, as for a church's page. They
// answer a few guided questions (the answers become the story, which they can
// change) and choose who reads it: only them, their church (its page's
// Stories tab, api/profile.js), or their church and the team (/admin,
// api/admin/testimonies.js), who may feature it. Under 18, a parent or
// guardian approves it through their own link (/g/<guardian_key>) before
// anyone else reads it, and again after any change. The page also makes a
// picture of the story they post themselves; nothing is published by us.
//
//   GET ?part=start&lang=xx[&church=<id>] -> { languages, lang, dir, text, guide, examples, church }:
//                               the start page's wording, the advice and the example stories,
//                               read before asking for a link; `church` is the one picked by
//                               its QR code (its page)
//   GET ?part=churches&q=..  -> { churches: [{ id, name, place }] }: finished, real
//                               signups whose name or city contains q (2+ letters), up to 20
//   POST ?part=link { lang, church, phone } -> { sent: true } or 400/429/503
//                               { error, field, message }: texts story_link_text with
//                               /s/<key> (one testimony per phone; the latest church
//                               and language picked win). Bots get { sent: true } and
//                               nothing is sent; limits as for Get my link (lib/web-guard.js).
//   GET ?key=..              -> { story, lang, dir, text, guide, examples }: the writing page
//   PATCH ?key=.. { first_name, answers, body, share, adult, consent }
//                            -> { story } or 400 { error, field, message }
//   POST ?key=..&part=guardian-text { phone } -> { sent: true } or 400/429/503: texts the
//                               parent or guardian their approval link (story_guardian_msg)
//   DELETE ?key=..           -> { deleted: true }: gone for good
//   GET ?g=<guardian_key>    -> { lang, dir, text, story, waiting }: the approval page
//   POST ?g=<guardian_key> { approve, name, agree } -> { story, waiting }: approved (or not yet)

import { logEvent } from "../lib/events.js";
import { isProfileKey, newProfileKey, siteUrl } from "../lib/profile-link.js";
import { needsGuardian, readable } from "../lib/stories.js";
import { db, eq } from "../lib/supabase.js";
import { canText, explainStatus, sendText } from "../lib/voipms.js";
import { looksLikeBot, record, textsLeft, visitor, withinLimits } from "../lib/web-guard.js";
import { anyPhoneValue, dir, languages, wording } from "../lib/web-text.js";

const TEXT_KEYS = [
  "web_language", "web_phone", "web_phone_invalid", "web_required", "web_wait", "web_busy", "web_bad_link",
  "story_intro", "story_church", "story_church_hint", "story_church_none", "story_phone_hint", "story_send",
  "story_sent", "story_title", "story_name", "story_body", "story_body_hint", "story_consent", "story_save",
  "story_saved", "story_guide", "story_delete", "story_delete_confirm", "story_deleted",
  "story_questions", "story_questions_hint", "story_q_before", "story_q_why", "story_q_moment", "story_q_advice",
  "story_q_verse", "story_share", "story_share_me", "story_share_church", "story_share_baptize", "story_age",
  "story_age_yes", "story_age_no", "story_guardian", "story_guardian_ok", "story_card", "story_card_hint",
  "story_card_button", "story_card_save", "story_copy", "story_copied", "story_card_church",
  "story_phone_invalid", "story_cant_text", "story_speak", "story_listening", "story_card_pick", "story_name_label",
  "story_examples", "story_status_me", "story_status_church", "story_status_baptize", "story_status_read", "story_status_featured",
  "j_start_button", "story_guardian_after", "story_guardian_wait", "story_guardian_yes", "story_guardian_no",
  "story_guardian_ask", "story_guardian_send", "story_guardian_phone", "story_guardian_text_button", "story_guardian_texted",
  "story_guardian_msg", "story_copied", "g_title", "g_intro", "g_share", "g_share_church", "g_share_baptize", "g_name",
  "g_agree", "g_approve", "g_not_yet", "g_approved", "g_declined", "g_nothing",
];
const NAME_MAX = 60;
const BODY_MAX = 4000; // the advice asks for about 250 words; this only stops abuse
const ANSWER_MAX = 1000;
const QUESTIONS = ["before", "why", "moment", "advice", "verse"]; // story_q_<name>
const SHARES = { me: "story_share_me", church: "story_share_church", baptize: "story_share_baptize" };
const STORY_FIELDS = "id,phone,church_id,lang,first_name,answers,body,share,adult,guardian_name,guardian_at,guardian_key,"
  + "guardian_declined_at,consent_text,consent_at,submitted_at,updated_at,seen_at,featured_at,simulated";


export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "POST", "PATCH", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    res.status(405).json({ error: "Use GET, POST, PATCH or DELETE." });
    return;
  }
  try {
    const params = new URL(req.url, "http://x").searchParams;
    const part = params.get("part");
    if (req.method === "GET" && part === "start") return await start(params.get("lang"), params.get("church"), res);
    if (req.method === "GET" && part === "churches") return await churches(params.get("q"), res);
    if (req.method === "POST" && part === "link") return await sendLink(req, req.body || {}, res);
    if (params.has("g")) return await guardianPage(req, params.get("g"), res);

    const key = params.get("key");
    const [story] = isProfileKey(key) ? await db(`btw_testimonies?key=${eq(key)}&select=${STORY_FIELDS}`) : [];
    if (!story) {
      res.status(404).json({ error: "not_found", text: await wording("en", TEXT_KEYS) });
      return;
    }
    if (req.method === "GET") return await page(req, story, res);
    if (req.method === "PATCH") return await save(req, story, req.body || {}, res);
    if (req.method === "POST" && part === "guardian-text") return await textGuardian(req, story, req.body || {}, res);
    if (req.method === "DELETE") {
      await db(`btw_testimonies?id=eq.${story.id}`, { method: "DELETE" });
      res.status(200).json({ deleted: true });
      return;
    }
    res.status(405).json({ error: "Use GET, PATCH or DELETE with a key." });
  } catch (err) {
    console.error("story:", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}

async function start(wanted, churchId, res) {
  const { languages: list, lang } = await languages(wanted);
  // From the church's QR code (simulations too, for the demo).
  const [text, guide, examples, [qr]] = await Promise.all([wording(lang, TEXT_KEYS), advice(lang), advice(lang, "story_examples"),
    /^[\w-]{1,64}$/.test(churchId || "") ? db(`btw_churches?id=${eq(churchId)}&completed_at=not.is.null&select=id,church_name,city,state,country`) : []]);
  res.status(200).json({ languages: list, lang, dir: dir(lang), text, guide, examples, church: qr ? { id: qr.id, name: qr.church_name, place: place(qr) } : null });
}

// The advice (or another btw_guides text, such as the example stories) in
// their language, English where it has none.
async function advice(lang, key = "testimony") {
  const langs = encodeURIComponent(`(${[...new Set(["en", lang])].join(",")})`);
  const guides = await db(`btw_guides?key=eq.${key}&lang=in.${langs}&select=lang,body`);
  return (guides.find((g) => g.lang === lang) || guides.find((g) => g.lang === "en"))?.body || "";
}

// "City, region" plus the country when it isn't the US.
const place = (c) => [c.city, c.state, c.country && c.country !== "US" ? c.country : null].filter(Boolean).join(", ");

async function churches(q, res) {
  // Letters, digits and spaces only: the rest would be PostgREST syntax.
  const term = String(q || "").normalize("NFC").replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  if (term.length < 2) return res.status(200).json({ churches: [] });
  const like = encodeURIComponent(`*${term}*`);
  const rows = await db(`btw_churches?completed_at=not.is.null&simulated=not.is.true&or=(church_name.ilike.${like},city.ilike.${like})`
    + "&select=id,church_name,city,state,country,completed_at,simulated&order=church_name&limit=20");
  const needle = term.toLowerCase();
  res.status(200).json({ churches: rows
    .filter((c) => c.completed_at && !c.simulated && c.church_name && [c.church_name, c.city].some((v) => String(v || "").toLowerCase().includes(needle)))
    .map((c) => ({ id: c.id, name: c.church_name, place: place(c) })) });
}

async function sendLink(req, body, res) {
  const { lang } = await languages(body.lang);
  const words = await wording(lang, TEXT_KEYS);
  const refuse = (status, field, prompt, error) => res.status(status).json({ error, field, message: words[prompt] || error });

  const [church] = body.church ? await db(`btw_churches?id=${eq(body.church)}&select=id,completed_at,simulated`) : [];
  // A simulated church only comes from its QR code (search never shows one): a demo.
  if (!church || !church.completed_at || (church.simulated && !body.via_qr)) return refuse(400, "church", "story_church_hint", "Pick your church from the list.");
  // Any country's number; whether we can text it depends on the provider.
  const phone = anyPhoneValue(body.phone);
  if (!phone) return refuse(400, "phone", "story_phone_invalid", "Enter your mobile number, with + and your country code outside the US and Canada.");
  if (!canText(phone)) return refuse(400, "phone", "story_cant_text", "We can't text numbers in your country yet.");

  const ip = visitor(req);
  if (looksLikeBot(body)) {
    await record("bot", ip, phone);
    return res.status(200).json({ sent: true });
  }
  if (!(await withinLimits("story", ip, phone))) return refuse(429, null, "web_wait", "Too many tries. Please wait a few minutes and try again.");
  if (!(await textsLeft())) return refuse(503, null, "web_busy", "We can't send texts right now. Please try again later.");
  await record("story", ip, phone);

  // One testimony per phone: a new link request keeps its key and story.
  const [existing] = await db(`btw_testimonies?phone=${eq(phone)}&select=id,key`);
  let key = existing?.key;
  if (existing) {
    await db(`btw_testimonies?id=eq.${existing.id}`, { method: "PATCH", body: { church_id: church.id, lang } });
  } else {
    key = newProfileKey();
    await db("btw_testimonies", { method: "POST", body: { phone, church_id: church.id, lang, key } });
  }

  const template = (await wording(lang, ["story_link_text"])).story_link_text || "Write your baptism story here: {link}";
  const link = `${siteUrl(req)}/s/${key}`;
  try {
    await sendText(canText(phone), template.includes("{link}") ? template.replace("{link}", link) : `${template} ${link}`);
  } catch (err) {
    const why = err.status ? explainStatus(err.status) : err.message;
    await logEvent("error", "story", `A testimony link wasn't sent: ${why}`, { phone });
    return refuse(502, null, "web_busy", "We couldn't text that number. Check it, or try again later.");
  }
  res.status(200).json({ sent: true });
}

async function page(req, story, res) {
  const lang = story.lang || "en";
  const [text, [church], guide, examples] = await Promise.all([
    wording(lang, TEXT_KEYS),
    story.church_id ? db(`btw_churches?id=eq.${story.church_id}&select=church_name,city,state,country`) : [],
    advice(lang),
    advice(lang, "story_examples"),
  ]);
  res.status(200).json({ story: view(story, church, req), lang, dir: dir(lang), text, guide, examples });
}

const view = (s, church, req) => ({
  first_name: s.first_name || "", answers: s.answers || {}, body: s.body || "", share: s.share || null,
  // Their story's status: read by the team (since their last change) and featured.
  // (Under 18, only while their parent or guardian's approval stands.)
  read: s.share === "baptize" && readable(s) && !!s.seen_at, featured: s.share === "baptize" && readable(s) && !!s.featured_at,
  adult: s.adult ?? null, consent: !!s.consent_at, submitted_at: s.submitted_at,
  // Under 18: where their parent or guardian's approval stands, and its link.
  guardian: s.submitted_at && needsGuardian(s) && s.guardian_key ? {
    status: s.guardian_at ? "approved" : s.guardian_declined_at ? "declined" : "waiting",
    name: s.guardian_at ? s.guardian_name || "" : "", link: `${siteUrl(req)}/g/${s.guardian_key}`,
  } : null,
  church: church ? { name: church.church_name, place: place(church) } : null,
});

async function save(req, story, body, res) {
  const words = await wording(story.lang || "en", TEXT_KEYS);
  const refuse = (field, prompt, error) => res.status(400).json({ error, field, message: words[prompt] || error });
  const firstName = String(body.first_name ?? "").trim().replace(/\s+/g, " ");
  const text = String(body.body ?? "").replace(/\r\n/g, "\n").trim();
  if (!firstName) return refuse("first_name", "web_required", "Enter your first name.");
  if (firstName.length > NAME_MAX) return refuse("first_name", "web_required", `Keep it under ${NAME_MAX} characters.`);
  const answers = {};
  for (const q of QUESTIONS) {
    const a = String(body.answers?.[q] ?? "").replace(/\r\n/g, "\n").trim();
    if (a.length > ANSWER_MAX) return refuse(`q_${q}`, "story_body_hint", "That's too long.");
    if (a) answers[q] = a;
  }
  if (!text) return refuse("body", "web_required", "Write your story.");
  if (text.length > BODY_MAX) return refuse("body", "story_body_hint", "That's too long: about 250 words or less.");
  const share = String(body.share || "");
  if (!SHARES[share]) return refuse("share", "web_required", "Choose who can read your story.");

  // Anyone else reading it needs their OK; under 18, their parent or
  // guardian's too, given on the guardian's own page (guardianPage).
  const now = new Date().toISOString();
  let adult = null;
  if (share !== "me") {
    if (body.adult !== true && body.adult !== false) return refuse("adult", "web_required", "Tell us if you're 18 or older.");
    adult = body.adult;
    if (body.consent !== true) return refuse("consent", "web_required", "Tick the box to save your story.");
  }
  // What they agreed to, word for word in their language.
  const consentText = share === "me" ? null : [
    `${words.story_share || "Who can read your story?"} ${words[SHARES[share]] || share}`,
    words.story_consent || "",
  ].filter(Boolean).join("\n");
  // An approval stands until what the readers would see changes.
  const next = { share, adult };
  const same = story.guardian_at && story.first_name === firstName && story.body === text && story.share === share
    && story.adult === adult && JSON.stringify(story.answers || {}) === JSON.stringify(answers);
  const guardian = !needsGuardian(next) ? { guardian_name: null, guardian_at: null, guardian_declined_at: null }
    : same ? {}
    : { guardian_name: null, guardian_at: null, guardian_declined_at: null, guardian_key: story.guardian_key || newProfileKey() };

  const [saved] = await db(`btw_testimonies?id=eq.${story.id}&select=${STORY_FIELDS}`, {
    method: "PATCH",
    body: {
      first_name: firstName, answers, body: text, share, adult, ...guardian,
      // The guardian's own words stay with an approval that stands.
      consent_text: same ? story.consent_text : consentText, consent_at: consentText ? now : null,
      submitted_at: story.submitted_at || now,
      // New for the team again after each change; only stories shared with
      // the team can be featured.
      seen_at: null,
      ...(share === "baptize" ? {} : { featured_at: null }),
    },
    prefer: "return=representation",
  });
  res.status(200).json({ story: view(saved, null, req) });
}

// The writer texts their parent or guardian the approval link (US and
// Canadian numbers today, as for the writer's own link).
async function textGuardian(req, story, body, res) {
  const words = await wording(story.lang || "en", TEXT_KEYS);
  const refuse = (status, field, prompt, error) => res.status(status).json({ error, field, message: words[prompt] || error });
  if (!story.submitted_at || !needsGuardian(story) || !story.guardian_key) return refuse(400, null, "g_nothing", "There's nothing to approve right now.");
  const phone = anyPhoneValue(body.phone);
  if (!phone) return refuse(400, "guardian_phone", "story_phone_invalid", "Enter their mobile number.");
  if (!canText(phone)) return refuse(400, "guardian_phone", "story_cant_text", "We can't text numbers in that country yet.");
  const ip = visitor(req);
  if (!(await withinLimits("guardian", ip, phone))) return refuse(429, null, "web_wait", "Too many tries. Please wait a few minutes and try again.");
  if (!(await textsLeft())) return refuse(503, null, "web_busy", "We can't send texts right now. Please try again later.");
  await record("guardian", ip, phone);
  const message = (words.story_guardian_msg || "{name} wants to share their baptism story. Please read it and approve it here: {link}")
    .replace("{name}", story.first_name || "").replace("{link}", `${siteUrl(req)}/g/${story.guardian_key}`);
  // A sample story's "parent" is made up: nothing is texted.
  if (!story.simulated) {
    try {
      await sendText(canText(phone), message);
    } catch (err) {
      const why = err.status ? explainStatus(err.status) : err.message;
      await logEvent("error", "story", `A guardian's approval link wasn't sent: ${why}`, { phone });
      return refuse(502, null, "web_busy", "We couldn't text that number. Check it, or try again later.");
    }
  }
  res.status(200).json({ sent: true });
}

// The parent or guardian's page: the story as its readers would see it, and
// their approval. Their link only works while the story needs it.
async function guardianPage(req, gkey, res) {
  const [story] = isProfileKey(gkey) ? await db(`btw_testimonies?guardian_key=${eq(gkey)}&select=${STORY_FIELDS}`) : [];
  const lang = story?.lang || "en";
  const text = await wording(lang, TEXT_KEYS);
  if (!story) return res.status(404).json({ error: "not_found", text });
  const waiting = !!story.submitted_at && needsGuardian(story);
  const show = async (s) => {
    const [church] = s.church_id ? await db(`btw_churches?id=eq.${s.church_id}&select=church_name,city,state,country`) : [];
    res.status(200).json({ lang, dir: dir(lang), text, waiting: !!s.submitted_at && needsGuardian(s), story: waiting ? {
      first_name: s.first_name, body: s.body, share: s.share, approved: !!s.guardian_at, declined: !s.guardian_at && !!s.guardian_declined_at,
      name: s.guardian_name || "", church: church ? { name: church.church_name, place: place(church) } : null,
    } : { first_name: s.first_name } });
  };
  if (req.method === "GET") return await show(story);
  if (req.method !== "POST") return res.status(405).json({ error: "Use GET or POST." });
  const body = req.body || {};
  const refuse = (field, prompt, error) => res.status(400).json({ error, field, message: text[prompt] || error });
  if (!waiting) return refuse(null, "g_nothing", "There's nothing to approve right now.");
  const now = new Date().toISOString();
  let change;
  if (body.approve === true) {
    const name = String(body.name ?? "").trim().replace(/\s+/g, " ");
    if (!name) return refuse("name", "web_required", "Enter your name.");
    if (name.length > NAME_MAX) return refuse("name", "web_required", `Keep it under ${NAME_MAX} characters.`);
    if (body.agree !== true) return refuse("agree", "web_required", "Tick the box to approve it.");
    if (story.guardian_at) return await show(story); // approved already
    // What they agreed to, word for word, after the writer's own consent.
    const agreed = `${(text.g_agree || "I am {name}'s parent or guardian.").replace("{name}", story.first_name || "")} (${name})`;
    change = { guardian_at: now, guardian_name: name, guardian_declined_at: null, seen_at: null,
      consent_text: [story.consent_text, agreed].filter(Boolean).join("\n") };
  } else {
    // Taking back an approval drops its line from what was agreed.
    const consent = String(story.consent_text || "").split("\n");
    change = { guardian_at: null, guardian_name: null, guardian_declined_at: now, featured_at: null,
      consent_text: (story.guardian_at ? consent.slice(0, -1) : consent).join("\n") || null };
  }
  const [saved] = await db(`btw_testimonies?id=eq.${story.id}&select=${STORY_FIELDS}`, { method: "PATCH", body: change, prefer: "return=representation" });
  await show(saved);
}
