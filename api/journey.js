// /api/journey.js
// The first 30 days of faith (public/journey.html at /journey and /j/<key>).
// Online only: nothing is texted. The private link is the only login, as for
// a church's page. Their church follows along on its page's Newly baptized
// tab (api/profile.js); the team on Discipleship in /admin.
//
//   GET ?part=start&lang=xx[&story=<testimony key>][&church=<id>] -> { languages, lang, dir,
//                         text, from, church }: the start page's wording; `from` prefills
//                         first name and church when they come from their saved story;
//                         `church` is the church picked by its QR code (their page)
//   GET ?part=churches&q=..  -> as api/story.js (finished, real signups)
//   POST ?part=start { lang, church | story, first_name, consent, contact_ok, phone, tz }
//                         -> { key } or 400 { error, field, message }; one journey per story
//   GET ?key=..           -> { journey, church, days, lang, dir, text }: days that are
//                         open carry their content and a Read it link; later ones only
//                         their number
//   PATCH ?key=.. { done: n, value }                     -> { journey }
//   PATCH ?key=.. { checkin: { day, answer, note, next_step } } -> { journey }
//   GET ?key=..&part=calendar&time=HH:MM  -> a .ics file: a daily reminder for the days left

import { CHECKIN_DAYS, DAYS, NEXT_STEPS, bibleTemplate, currentDay, dateIn, loadDays, readUrl, validZone } from "../lib/journeys.js";
import { isProfileKey, newProfileKey, siteUrl } from "../lib/profile-link.js";
import { db, eq } from "../lib/supabase.js";
import { looksLikeBot, record, visitor, withinLimits } from "../lib/web-guard.js";
import { dir, languages, phoneValue, wording } from "../lib/web-text.js";

const TEXT_KEYS = [
  "web_language", "web_phone", "web_phone_invalid", "web_required", "web_wait", "web_bad_link",
  "story_name", "story_church", "story_church_hint", "story_church_none", "land_baptized_button",
  "j_title", "j_intro", "j_start_button", "j_consent", "j_contact", "j_phone_hint", "j_bookmark", "j_day", "j_locked",
  "j_read", "j_question", "j_step", "j_done", "j_checkin", "j_good", "j_hard", "j_ask", "j_note", "j_send", "j_sent",
  "story_age", "story_age_yes", "story_age_no",
  "j_next", "j_next_group", "j_next_serve", "j_next_class", "j_next_unsure", "j_calendar", "j_week_note", "j_finished",
];
const FIELDS = "id,key,church_id,testimony_id,first_name,lang,started_on,tz,done_days,next_step";
const NOTE_MAX = 1000;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "POST", "PATCH"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, PATCH");
    res.status(405).json({ error: "Use GET, POST or PATCH." });
    return;
  }
  try {
    const params = new URL(req.url, "http://x").searchParams;
    const part = params.get("part");
    if (req.method === "GET" && part === "start") return await startPage(params.get("lang"), params.get("story"), params.get("church"), res);
    if (req.method === "GET" && part === "churches") return await churches(params.get("q"), res);
    if (req.method === "POST" && part === "start") return await start(req, req.body || {}, res);

    const key = params.get("key");
    const [journey] = isProfileKey(key) ? await db(`btw_journeys?key=${eq(key)}&select=${FIELDS}`) : [];
    if (!journey) {
      res.status(404).json({ error: "not_found", text: await wording("en", TEXT_KEYS) });
      return;
    }
    if (req.method === "GET" && part === "calendar") return await calendar(req, journey, params.get("time"), res);
    if (req.method === "GET") return await page(journey, res);
    return await update(journey, req.body || {}, res);
  } catch (err) {
    console.error("journey:", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}

const place = (c) => [c.city, c.state, c.country && c.country !== "US" ? c.country : null].filter(Boolean).join(", ");

async function storyFor(key) {
  if (!isProfileKey(key)) return null;
  const [s] = await db(`btw_testimonies?key=${eq(key)}&select=id,phone,church_id,lang,first_name,adult`);
  return s || null;
}

async function startPage(wanted, storyKey, churchId, res) {
  const story = await storyFor(storyKey);
  const { languages: list, lang } = await languages(wanted || story?.lang);
  let from = null;
  if (story) {
    const [c] = story.church_id ? await db(`btw_churches?id=eq.${story.church_id}&select=id,church_name,city,state,country`) : [];
    from = { first_name: story.first_name || "", adult: story.adult ?? null, church: c ? { id: c.id, name: c.church_name, place: place(c) } : null };
  }
  // From the church's QR code (simulations too, for the demo).
  const [qr] = !story && /^[\w-]{1,64}$/.test(churchId || "")
    ? await db(`btw_churches?id=${eq(churchId)}&completed_at=not.is.null&select=id,church_name,city,state,country`) : [];
  res.status(200).json({ languages: list, lang, dir: dir(lang), text: await wording(lang, TEXT_KEYS), from,
    church: qr ? { id: qr.id, name: qr.church_name, place: place(qr) } : null });
}

// The same search as the testimony form's.
async function churches(q, res) {
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

async function start(req, body, res) {
  const story = await storyFor(body.story);
  const { lang } = await languages(body.lang || story?.lang);
  const words = await wording(lang, TEXT_KEYS);
  const refuse = (status, field, prompt, error) => res.status(status).json({ error, field, message: words[prompt] || error });

  // From their story: its church and its phone (proved by the texted link).
  if (story) {
    const [existing] = await db(`btw_journeys?testimony_id=eq.${story.id}&select=key`);
    if (existing) return res.status(200).json({ key: existing.key });
  }
  const churchId = story ? story.church_id : body.church;
  const [church] = churchId ? await db(`btw_churches?id=${eq(churchId)}&select=id,completed_at,simulated`) : [];
  // A simulated church only comes from its QR code (search never shows one): a demo.
  if (!church || !church.completed_at || (church.simulated && !body.via_qr)) return refuse(400, "church", "story_church_hint", "Pick your church from the list.");
  const firstName = String(body.first_name ?? "").trim().replace(/\s+/g, " ");
  if (!firstName || firstName.length > 60) return refuse(400, "first_name", "web_required", "Enter your first name.");
  // 18 or older (their story may already say). Under 18, no phone is taken:
  // churches don't get a minor's number.
  const adult = story?.adult === true || story?.adult === false ? story.adult : body.adult;
  if (adult !== true && adult !== false) return refuse(400, "adult", "web_required", "Tell us if you're 18 or older.");
  const contactOk = adult && body.contact_ok === true;
  let phone = null;
  if (contactOk) {
    phone = story?.phone || phoneValue(body.phone);
    if (!phone) return refuse(400, "phone", "web_phone_invalid", "Enter a US or Canadian mobile number with its area code.");
  }
  if (body.consent !== true) return refuse(400, "consent", "web_required", "Tick the box to start.");

  const ip = visitor(req);
  // Bots get a link that leads nowhere; nothing is saved.
  if (looksLikeBot(body)) {
    await record("bot", ip, null);
    return res.status(200).json({ key: newProfileKey() });
  }
  if (!(await withinLimits("journey", ip, null))) return refuse(429, null, "web_wait", "Too many tries. Please wait a few minutes and try again.");
  await record("journey", ip, phone);

  const tz = validZone(body.tz);
  const key = newProfileKey();
  const now = new Date().toISOString();
  await db("btw_journeys", { method: "POST", body: {
    key, church_id: church.id, testimony_id: story?.id || null, first_name: firstName, lang, adult, phone, contact_ok: contactOk,
    consent_text: words.j_consent || null, consent_at: now, started_on: dateIn(tz), tz, seen_at: now,
  } });
  res.status(200).json({ key });
}

async function page(journey, res) {
  const lang = journey.lang || "en";
  const [text, days, template, checkins, [church]] = await Promise.all([
    wording(lang, TEXT_KEYS), loadDays(lang), bibleTemplate(lang),
    db(`btw_checkins?journey_id=eq.${journey.id}&select=day,answer,note,created_at&order=day`),
    journey.church_id ? db(`btw_churches?id=eq.${journey.church_id}&select=church_name,weekly_note`) : [],
    db(`btw_journeys?id=eq.${journey.id}`, { method: "PATCH", body: { seen_at: new Date().toISOString() } }),
  ]);
  const today = currentDay(journey);
  const open = Math.min(today, DAYS);
  res.status(200).json({
    journey: view(journey, checkins, today),
    church: church ? { name: church.church_name, weekly_note: church.weekly_note || "" } : null,
    days: days.map((d) => d.day <= open
      ? { day: d.day, open: true, theme: d.theme, passage: d.passage, note: d.note, question: d.question, step: d.step, read: readUrl(template, d.english_passage) }
      : { day: d.day, open: false }),
    lang, dir: dir(lang), text,
  });
}

const view = (j, checkins, today = currentDay(j)) => ({
  first_name: j.first_name, today: Math.min(today, DAYS), started_on: j.started_on, done_days: j.done_days || [],
  next_step: j.next_step, checkin_days: CHECKIN_DAYS,
  checkins: Object.fromEntries(checkins.map((c) => [c.day, { answer: c.answer, note: c.note || "" }])),
  finished: (j.done_days || []).length === DAYS,
});

async function update(journey, body, res) {
  const open = Math.min(currentDay(journey), DAYS);
  const words = await wording(journey.lang || "en", TEXT_KEYS);
  const refuse = (field, error) => res.status(400).json({ error, field, message: words.web_required || error });

  if ("done" in body) {
    const day = Number(body.done);
    if (!Number.isInteger(day) || day < 1 || day > open) return refuse("done", "That day isn't open yet.");
    const set = new Set(journey.done_days || []);
    if (body.value === false) set.delete(day); else set.add(day);
    journey.done_days = [...set].sort((a, b) => a - b);
    await db(`btw_journeys?id=eq.${journey.id}`, { method: "PATCH", body: { done_days: journey.done_days } });
  } else if (body.checkin) {
    const { day, answer } = body.checkin;
    const note = String(body.checkin.note ?? "").trim().slice(0, NOTE_MAX) || null;
    if (!CHECKIN_DAYS.includes(day) || day > open) return refuse("checkin", "That check-in isn't open yet.");
    if (!["good", "hard", "question"].includes(answer)) return refuse("checkin", "Pick an answer.");
    await db("btw_checkins?on_conflict=journey_id,day", {
      method: "POST",
      body: { journey_id: journey.id, day, answer, note, created_at: new Date().toISOString() },
      prefer: "resolution=merge-duplicates",
    });
    if (day === DAYS && NEXT_STEPS.includes(body.checkin.next_step)) {
      journey.next_step = body.checkin.next_step;
      await db(`btw_journeys?id=eq.${journey.id}`, { method: "PATCH", body: { next_step: journey.next_step } });
    }
  } else {
    return refuse(null, "Nothing to save.");
  }
  const checkins = await db(`btw_checkins?journey_id=eq.${journey.id}&select=day,answer,note,created_at&order=day`);
  res.status(200).json({ journey: view(journey, checkins) });
}

// A daily reminder at `time` (their phone's local time) for the days still
// to open, each opening their page.
async function calendar(req, journey, time, res) {
  const [, hh = "08", mm = "00"] = String(time || "").match(/^(\d{1,2}):(\d{2})$/) || [];
  const h = String(Math.min(23, Number(hh))).padStart(2, "0");
  const m = String(Math.min(59, Number(mm))).padStart(2, "0");
  const today = Math.min(currentDay(journey), DAYS);
  const count = DAYS - today + 1;
  const first = dateIn(journey.tz).replace(/-/g, "");
  const link = `${siteUrl(req)}/j/${journey.key}`;
  const title = (await wording(journey.lang || "en", ["j_title"])).j_title || "Your first 30 days";
  const esc = (s) => String(s).replace(/[\\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Baptize 2027//First 30 days//EN", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT", `UID:${journey.key}@baptize.app`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    // No time zone: the event happens at that local time wherever the phone is.
    `DTSTART:${first}T${h}${m}00`, `DURATION:PT10M`, `RRULE:FREQ=DAILY;COUNT=${count}`,
    `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(link)}`, `URL:${link}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(title)}`, "TRIGGER:PT0M", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="first-30-days.ics"');
  res.status(200).send(ics);
}
