// /api/admin/events.js
// The problem log for the editor's Log panel. Needs the admin session.
//
//   GET -> { events: [{ id, level, source, phone, message, detail, created_at }] }
//          the latest 200, newest first

import { requireAdmin } from "../../lib/admin-auth.js";
import { db } from "../../lib/supabase.js";

const LIMIT = 200;

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Use GET." });
    return;
  }
  try {
    const events = await db(`btw_events?select=*&order=id.desc&limit=${LIMIT}`);
    res.status(200).json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
