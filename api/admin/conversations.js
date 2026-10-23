// /api/admin/conversations.js
// The signups and their texts, for the editor's Conversations panel. Needs
// the admin session.
//
//   GET               -> { conversations: [{ phone, church_name, name, status, lang, phase, step,
//                        last_at, unread, ... }] } newest activity first; one per phone number;
//                        unread counts the pastor's team texts nobody has opened
//   GET ?phone=+1...  -> { church, session, messages: [{ thread, direction, body, translation, error,
//                        created_at, sender: { name } }] }
//                        the latest messages, oldest first; marks the team texts read
//   POST ?phone=+1... { body }  -> { message }: texts the pastor from the
//                        team thread as the logged-in user (refused after STOP;
//                        a simulated signup's message is saved but not sent)
//   POST ?phone=+1... { sendLink: true } -> { message }: the same, with the
//                        pastor's page link (done_link in their language); makes
//                        the link's key first if the signup has none
//   POST ?phone=+1... { finish: true } -> { finished: true }: closes an
//                        unfinished signup as if they'd texted DONE (nothing is
//                        texted): the questions stop, missing answers stay
//                        blank, and their replies go to the team thread
//   POST ?phone=+1... { translate } -> { text }: that English in the
//                        pastor's signup language, to check before sending
//   DELETE ?phone=+1...  -> { deleted: true }: the number's texts, answers,
//                        session and logged problems, so its next text
//                        starts a new signup

import { requireAdmin } from "../../lib/admin-auth.js";
import { logEvent } from "../../lib/events.js";
import { db, eq } from "../../lib/supabase.js";
import { newProfileKey, profileUrl, siteUrl } from "../../lib/profile-link.js";
import { translate } from "../../lib/translate.js";
import { MMS_MAX, explainStatus, sendText } from "../../lib/voipms.js";

const LIST_LIMIT = 500;
const THREAD_LIMIT = 1000;
// sender: who sent a team message, through btw_messages.sent_by.
const MESSAGE_FIELDS = "id,thread,direction,body,translation,error,read_at,created_at,sender:btw_users(name)";

export default async function handler(req, res) {
  const user = await requireAdmin(req, res);
  if (!user) return;
  if (!["GET", "POST", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, DELETE");
    res.status(405).json({ error: "Use GET, POST or DELETE." });
    return;
  }
  try {
    const phone = new URL(req.url, "http://x").searchParams.get("phone");
    if (req.method === "DELETE") return await remove(phone, res);
    if (req.method === "POST") return await post(phone, req.body || {}, user, res, siteUrl(req));
    if (phone) return await thread(phone, res);
    return await list(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function list(res) {
  // btw_churches is written on every incoming text, so its updated_at is
  // the time of the last text.
  // Team texts don't touch btw_churches, so they count separately.
  const [churches, sessions, team] = await Promise.all([
    db(`btw_churches?select=phone,name,email,church_name,country,street,city,state,zip,denomination,website,contact_name,contact_phone,status,lang,created_at,updated_at,completed_at,edited_at,simulated,editor:btw_users(name)&order=updated_at.desc&limit=${LIST_LIMIT}`),
    db(`btw_sessions?select=phone,phase,queue,editing&order=updated_at.desc&limit=${LIST_LIMIT}`),
    db(`btw_messages?thread=eq.team&select=phone,direction,read_at,created_at&order=id.desc&limit=5000`),
  ]);
  const byPhone = new Map(sessions.map((s) => [s.phone, s]));
  const teamBy = new Map();
  for (const m of team) {
    const t = teamBy.get(m.phone) || { last: m.created_at, unread: 0 };
    if (m.direction === "in" && !m.read_at) t.unread++;
    teamBy.set(m.phone, t);
  }
  const conversations = churches.map((c) => {
    const s = byPhone.get(c.phone);
    const t = teamBy.get(c.phone);
    const last_at = t && t.last > c.updated_at ? t.last : c.updated_at;
    return { ...c, phase: s?.phase ?? null, step: s?.queue?.[0] ?? null, editing: !!s?.editing, last_at, unread: t?.unread || 0 };
  });
  conversations.sort((a, b) => Date.parse(b.last_at) - Date.parse(a.last_at));
  res.status(200).json({ conversations });
}

async function thread(phone, res) {
  const [[church], [session], messages] = await Promise.all([
    db(`btw_churches?phone=${eq(phone)}&select=*,editor:btw_users(name)`),
    db(`btw_sessions?phone=${eq(phone)}&select=*`),
    db(`btw_messages?phone=${eq(phone)}&select=${MESSAGE_FIELDS}&order=id.desc&limit=${THREAD_LIMIT}`),
  ]);
  if (!church && !session && messages.length === 0) {
    res.status(404).json({ error: "No conversation with that number." });
    return;
  }
  // Fetched newest first so a long thread keeps its latest texts.
  messages.sort((a, b) => a.id - b.id);
  if (messages.some((m) => m.thread === "team" && m.direction === "in" && !m.read_at)) {
    await db(`btw_messages?phone=${eq(phone)}&thread=eq.team&direction=eq.in&read_at=is.null`, {
      method: "PATCH",
      body: { read_at: new Date().toISOString() },
    });
  }
  res.status(200).json({ church: church || null, session: session || null, messages });
}

async function post(phone, body, user, res, site) {
  if (!/^\+1\d{10}$/.test(phone || "")) {
    res.status(400).json({ error: "Send the number as ?phone=+1XXXXXXXXXX." });
    return;
  }
  const [[session], [church]] = await Promise.all([
    db(`btw_sessions?phone=${eq(phone)}&select=phase,lang`),
    db(`btw_churches?phone=${eq(phone)}&select=lang,simulated,profile_key,completed_at`),
  ]);
  const lang = session?.lang || church?.lang || "en";

  if (body.finish) return finish(phone, session, church, res);

  if (typeof body.translate === "string") {
    const english = body.translate.trim();
    if (!english) {
      res.status(400).json({ error: "Write the message in English first." });
      return;
    }
    const [text] = lang === "en" ? [english] : await translate([english], lang);
    res.status(200).json({ text, lang });
    return;
  }

  let text = String(body.body ?? "").trim();
  if (body.sendLink) {
    if (!church) {
      res.status(404).json({ error: "This number hasn't started a signup, so there's no page to link to." });
      return;
    }
    text = await linkMessage(phone, church, lang, site);
  }
  if (!text) {
    res.status(400).json({ error: "Write a message first." });
    return;
  }
  if (text.length > MMS_MAX) {
    res.status(400).json({ error: `Keep it under ${MMS_MAX} characters.` });
    return;
  }
  if (!session) {
    res.status(404).json({ error: "No conversation with that number." });
    return;
  }
  if (session.phase === "stopped") {
    res.status(400).json({ error: "They texted STOP, so they can't be sent anything until they text START." });
    return;
  }

  let error = null;
  try {
    // Simulated numbers are fictional: keep the message, send nothing.
    if (!church?.simulated) await sendText(phone.slice(2), text);
  } catch (err) {
    error = err.status ? explainStatus(err.status) : `Couldn't reach ${process.env.VOIPMS_API_URL ? "the relay" : "voip.ms"}: ${err.message}`;
    await logEvent("error", "admin", `A message from the team wasn't sent: ${error}`, { phone, detail: { status: err.status || null } });
  }
  const [message] = await db(`btw_messages?select=${MESSAGE_FIELDS}`, {
    method: "POST",
    body: { phone, direction: "out", thread: "team", body: text, error, sent_by: user.id },
    prefer: "return=representation",
  });
  res.status(200).json({ message });
}

// Closes the signup: the session is "done" (the engine's finished state, so
// texts that aren't commands go to the team thread) and the church row is
// complete, with a page link key like a DONE would make.
async function finish(phone, session, church, res) {
  if (!session || !church) {
    res.status(404).json({ error: "This number hasn't started a signup." });
    return;
  }
  if (session.phase === "stopped") {
    res.status(400).json({ error: "They texted STOP, so the signup is already closed." });
    return;
  }
  const now = new Date().toISOString();
  await Promise.all([
    db(`btw_sessions?phone=${eq(phone)}`, { method: "PATCH", body: { phase: "done", queue: [], editing: false } }),
    church.completed_at ? null : db(`btw_churches?phone=${eq(phone)}`, {
      method: "PATCH",
      body: { completed_at: now, status: "complete", profile_key: church.profile_key || newProfileKey() },
    }),
  ]);
  res.status(200).json({ finished: true });
}

// done_link ("See or update your signup anytime: {link}") in the pastor's
// language, with their link; makes and saves the key if there isn't one.
async function linkMessage(phone, church, lang, site) {
  let key = church.profile_key;
  if (!key) {
    key = newProfileKey();
    await db(`btw_churches?phone=${eq(phone)}`, { method: "PATCH", body: { profile_key: key } });
  }
  const link = profileUrl(site, key);
  const langs = encodeURIComponent(`(${[...new Set(["en", lang])].join(",")})`);
  const rows = await db(`btw_prompts?key=eq.done_link&lang=in.${langs}&select=lang,text`);
  const template = (rows.find((r) => r.lang === lang) || rows.find((r) => r.lang === "en"))?.text || "{link}";
  return template.includes("{link}") ? template.replace("{link}", link) : `${template}\n${link}`;
}

async function remove(phone, res) {
  if (!/^\+1\d{10}$/.test(phone || "")) {
    res.status(400).json({ error: "Send the number as ?phone=+1XXXXXXXXXX." });
    return;
  }
  await Promise.all(["btw_sessions", "btw_churches", "btw_messages", "btw_events"].map((table) =>
    db(`${table}?phone=${eq(phone)}`, { method: "DELETE" })));
  res.status(200).json({ deleted: true });
}
