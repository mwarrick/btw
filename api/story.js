// /api/story.js
// Baptism testimonies (public/story.html at /story and /s/<key>). A baptized
// person picks a language and their church, types their phone, and is texted
// a private link; the link is the only login, as for a church's page. They
// answer a few guided questions (the answers become the story, which they can
// change) and choose who reads it: only them, their church (its page's
// Stories tab, api/profile.js), or their church and the team (/admin,
// api/admin/testimonies.js), who may feature it. Under 18, a parent or
// guardian's OK is needed before anyone else reads it. The page also makes a
// picture of the story they post themselves; nothing is published by us.
//
//   GET ?part=start&lang=xx  -> { languages, lang, dir, text, guide }: the start page's wording
//                               and the advice, read before asking for a link
//   GET ?part=churches&q=..  -> { churches: [{ id, name, place }] }: finished, real
//                               signups whose name or city contains q (2+ letters), up to 20
//   POST ?part=link { lang, church, phone } -> { sent: true } or 400/429/503
//                               { error, field, message }: texts story_link_text with
//                               /s/<key> (one testimony per phone; the latest church
//                               and language picked win). Bots get { sent: true } and
//                               nothing is sent; limits as for Get my link (lib/web-guard.js).
//   GET ?key=..              -> { story, lang, dir, text, guide }: the writing page
//   PATCH ?key=.. { first_name, answers, body, share, adult, guardian_name, guardian_ok, consent }
//                            -> { story } or 400 { error, field, message }
//   DELETE ?key=..           -> { deleted: true }: gone for good

import { logEvent } from "../lib/events.js";
import { isProfileKey, newProfileKey, siteUrl } from "../lib/profile-link.js";
import { db, eq } from "../lib/supabase.js";
import { explainStatus, sendText } from "../lib/voipms.js";
import { looksLikeBot, record, textsLeft, visitor, withinLimits } from "../lib/web-guard.js";
import { dir, languages, phoneValue, wording } from "../lib/web-text.js";

const TEXT_KEYS = [
  "web_language", "web_phone", "web_phone_invalid", "web_required", "web_wait", "web_busy", "web_bad_link",
  "story_intro", "story_church", "story_church_hint", "story_church_none", "story_phone_hint", "story_send",
  "story_sent", "story_title", "story_name", "story_body", "story_body_hint", "story_consent", "story_save",
  "story_saved", "story_guide", "story_delete", "story_delete_confirm", "story_deleted",
  "story_questions", "story_questions_hint", "story_q_before", "story_q_why", "story_q_moment", "story_q_advice",
  "story_q_verse", "story_share", "story_share_me", "story_share_church", "story_share_baptize", "story_age",
  "story_age_yes", "story_age_no", "story_guardian", "story_guardian_ok", "story_card", "story_card_hint",
  "story_card_button", "story_card_save", "story_copy", "story_copied", "story_card_church",
  "j_start_button",
];
const NAME_MAX = 60;
const BODY_MAX = 4000; // the advice asks for about 250 words; this only stops abuse
const ANSWER_MAX = 1000;
const QUESTIONS = ["before", "why", "moment", "advice", "verse"]; // story_q_<name>
const SHARES = { me: "story_share_me", church: "story_share_church", baptize: "story_share_baptize" };
const STORY_FIELDS = "id,phone,church_id,lang,first_name,answers,body,share,adult,guardian_name,guardian_at,consent_at,submitted_at,updated_at";

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
    if (req.method === "GET" && part === "start") return await start(params.get("lang"), res);
    if (req.method === "GET" && part === "churches") return await churches(params.get("q"), res);
    if (req.method === "POST" && part === "link") return await sendLink(req, req.body || {}, res);

    const key = params.get("key");
    const [story] = isProfileKey(key) ? await db(`btw_testimonies?key=${eq(key)}&select=${STORY_FIELDS}`) : [];
    if (!story) {
      res.status(404).json({ error: "not_found", text: await wording("en", TEXT_KEYS) });
      return;
    }
    if (req.method === "GET") return await page(story, res);
    if (req.method === "PATCH") return await save(story, req.body || {}, res);
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

async function start(wanted, res) {
  const { languages: list, lang } = await languages(wanted);
  const [text, guide] = await Promise.all([wording(lang, TEXT_KEYS), advice(lang)]);
  res.status(200).json({ languages: list, lang, dir: dir(lang), text, guide });
}

// The advice in their language, English where it has none.
async function advice(lang) {
  const langs = encodeURIComponent(`(${[...new Set(["en", lang])].join(",")})`);
  const guides = await db(`btw_guides?key=eq.testimony&lang=in.${langs}&select=lang,body`);
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
  if (!church || !church.completed_at || church.simulated) return refuse(400, "church", "story_church_hint", "Pick your church from the list.");
  const phone = phoneValue(body.phone);
  if (!phone) return refuse(400, "phone", "web_phone_invalid", "Enter a US or Canadian mobile number with its area code.");

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
    await sendText(phone.slice(2), template.includes("{link}") ? template.replace("{link}", link) : `${template} ${link}`);
  } catch (err) {
    const why = err.status ? explainStatus(err.status) : err.message;
    await logEvent("error", "story", `A testimony link wasn't sent: ${why}`, { phone });
    return refuse(502, null, "web_busy", "We couldn't text that number. Check it, or try again later.");
  }
  res.status(200).json({ sent: true });
}

async function page(story, res) {
  const lang = story.lang || "en";
  const [text, [church], guide] = await Promise.all([
    wording(lang, TEXT_KEYS),
    story.church_id ? db(`btw_churches?id=eq.${story.church_id}&select=church_name,city,state,country`) : [],
    advice(lang),
  ]);
  res.status(200).json({ story: view(story, church), lang, dir: dir(lang), text, guide });
}

const view = (s, church) => ({
  first_name: s.first_name || "", answers: s.answers || {}, body: s.body || "", share: s.share || null,
  adult: s.adult ?? null, guardian_name: s.guardian_name || "", guardian_ok: !!s.guardian_at,
  consent: !!s.consent_at, submitted_at: s.submitted_at,
  church: church ? { name: church.church_name, place: place(church) } : null,
});

async function save(story, body, res) {
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

  // Anyone else reading it needs their OK, and a parent or guardian's under 18.
  const now = new Date().toISOString();
  let adult = null, guardian = null;
  if (share !== "me") {
    if (body.adult !== true && body.adult !== false) return refuse("adult", "web_required", "Tell us if you're 18 or older.");
    adult = body.adult;
    if (!adult) {
      guardian = String(body.guardian_name ?? "").trim().replace(/\s+/g, " ");
      if (!guardian || guardian.length > NAME_MAX) return refuse("guardian_name", "web_required", "Enter your parent or guardian's name.");
      if (body.guardian_ok !== true) return refuse("guardian_ok", "web_required", "Your parent or guardian needs to agree first.");
    }
    if (body.consent !== true) return refuse("consent", "web_required", "Tick the box to save your story.");
  }
  // What they agreed to, word for word in their language.
  const consentText = share === "me" ? null : [
    `${words.story_share || "Who can read your story?"} ${words[SHARES[share]] || share}`,
    words.story_consent || "",
    guardian ? `${words.story_guardian || "Parent or guardian"}: ${guardian}. ${words.story_guardian_ok || ""}` : "",
  ].filter(Boolean).join("\n");

  const [saved] = await db(`btw_testimonies?id=eq.${story.id}&select=${STORY_FIELDS}`, {
    method: "PATCH",
    body: {
      first_name: firstName, answers, body: text, share, adult,
      guardian_name: guardian, guardian_at: guardian ? now : null,
      consent_text: consentText, consent_at: consentText ? now : null,
      submitted_at: story.submitted_at || now,
      // New for the team again after each change; only stories shared with
      // the team can be featured.
      seen_at: null,
      ...(share === "baptize" ? {} : { featured_at: null }),
    },
    prefer: "return=representation",
  });
  res.status(200).json({ story: view(saved, null) });
}
