// /api/admin/conversations.js
// The signups and their texts, for the editor's Conversations panel. Needs
// the admin session.
//
//   GET               -> { conversations: [{ phone, church_name, name, status, lang, phase, step, updated_at, ... }] }
//                        newest activity first; one per phone number
//   GET ?phone=+1...  -> { church, session, messages: [{ direction, body, created_at }] }
//                        the latest messages, oldest first

import { requireAdmin } from "../../lib/admin-auth.js";
import { db, eq } from "../../lib/supabase.js";

const LIST_LIMIT = 500;
const THREAD_LIMIT = 1000;

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Use GET." });
    return;
  }
  try {
    const phone = new URL(req.url, "http://x").searchParams.get("phone");
    if (phone) return await thread(phone, res);
    return await list(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function list(res) {
  // btw_churches is written on every incoming text, so its updated_at is
  // the time of the last text.
  const [churches, sessions] = await Promise.all([
    db(`btw_churches?select=phone,name,church_name,city,state,status,lang,created_at,updated_at,completed_at&order=updated_at.desc&limit=${LIST_LIMIT}`),
    db(`btw_sessions?select=phone,phase,queue,editing&order=updated_at.desc&limit=${LIST_LIMIT}`),
  ]);
  const byPhone = new Map(sessions.map((s) => [s.phone, s]));
  const conversations = churches.map((c) => {
    const s = byPhone.get(c.phone);
    return { ...c, phase: s?.phase ?? null, step: s?.queue?.[0] ?? null, editing: !!s?.editing };
  });
  res.status(200).json({ conversations });
}

async function thread(phone, res) {
  const [[church], [session], messages] = await Promise.all([
    db(`btw_churches?phone=${eq(phone)}&select=*`),
    db(`btw_sessions?phone=${eq(phone)}&select=*`),
    db(`btw_messages?phone=${eq(phone)}&select=id,direction,body,created_at&order=id.desc&limit=${THREAD_LIMIT}`),
  ]);
  if (!church && !session && messages.length === 0) {
    res.status(404).json({ error: "No conversation with that number." });
    return;
  }
  // Fetched newest first so a long thread keeps its latest texts.
  messages.sort((a, b) => a.id - b.id);
  res.status(200).json({ church: church || null, session: session || null, messages });
}
