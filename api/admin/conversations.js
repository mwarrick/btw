// /api/admin/conversations.js
// The signups and their texts, for the editor's Conversations panel. Needs
// the admin session.
//
//   GET               -> { conversations: [{ phone, church_name, name, status, lang, phase, step,
//                        last_at, unread, ... }] } newest activity first; one per phone number;
//                        unread counts the pastor's team texts nobody has opened
//   GET ?phone=+1...  -> { church, session, messages: [{ thread, direction, body, translation, error, created_at }] }
//                        the latest messages, oldest first; marks the team texts read
//   POST ?phone=+1... { body }  -> { message }: texts the pastor from the
//                        team thread (refused after STOP)
//   POST ?phone=+1... { translate } -> { text }: that English in the
//                        pastor's signup language, to check before sending
//   DELETE ?phone=+1...  -> { deleted: true }: the number's texts, answers,
//                        session and logged problems, so its next text
//                        starts a new signup

import { requireAdmin } from "../../lib/admin-auth.js";
import { logEvent } from "../../lib/events.js";
import { db, eq } from "../../lib/supabase.js";
import { translate } from "../../lib/translate.js";
import { MMS_MAX, explainStatus, sendText } from "../../lib/voipms.js";

const LIST_LIMIT = 500;
const THREAD_LIMIT = 1000;

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (!["GET", "POST", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, DELETE");
    res.status(405).json({ error: "Use GET, POST or DELETE." });
    return;
  }
  try {
    const phone = new URL(req.url, "http://x").searchParams.get("phone");
    if (req.method === "DELETE") return await remove(phone, res);
    if (req.method === "POST") return await post(phone, req.body || {}, res);
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
    db(`btw_churches?select=phone,name,church_name,city,state,status,lang,created_at,updated_at,completed_at&order=updated_at.desc&limit=${LIST_LIMIT}`),
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
    db(`btw_churches?phone=${eq(phone)}&select=*`),
    db(`btw_sessions?phone=${eq(phone)}&select=*`),
    db(`btw_messages?phone=${eq(phone)}&select=id,thread,direction,body,translation,error,read_at,created_at&order=id.desc&limit=${THREAD_LIMIT}`),
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

async function post(phone, body, res) {
  if (!/^\+1\d{10}$/.test(phone || "")) {
    res.status(400).json({ error: "Send the number as ?phone=+1XXXXXXXXXX." });
    return;
  }
  const [[session], [church]] = await Promise.all([
    db(`btw_sessions?phone=${eq(phone)}&select=phase,lang`),
    db(`btw_churches?phone=${eq(phone)}&select=lang`),
  ]);
  const lang = session?.lang || church?.lang || "en";

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

  const text = String(body.body ?? "").trim();
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
    await sendText(phone.slice(2), text);
  } catch (err) {
    error = err.status ? explainStatus(err.status) : `Couldn't reach ${process.env.VOIPMS_API_URL ? "the relay" : "voip.ms"}: ${err.message}`;
    await logEvent("error", "admin", `A message from the team wasn't sent: ${error}`, { phone, detail: { status: err.status || null } });
  }
  const [message] = await db("btw_messages?select=id,thread,direction,body,translation,error,read_at,created_at", {
    method: "POST",
    body: { phone, direction: "out", thread: "team", body: text, error },
    prefer: "return=representation",
  });
  res.status(200).json({ message });
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
