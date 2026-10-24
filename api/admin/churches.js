// /api/admin/churches.js
// A signup's saved answers, and changing them from /admin. Needs the admin
// session. Only btw_churches changes: the texts in btw_messages stay as
// they were.
//
//   GET ?phone=+1...  -> { church }
//   PATCH ?phone=+1... { name, email, church_name, street, city, state, zip,
//     denomination, website, contact_name, contact_phone, baptism_same,
//     baptism_street, baptism_city, baptism_state, baptism_zip, public_map }
//     -> { church }; any field can be left out. Records who edited and when.

import { requireAdmin } from "../../lib/admin-auth.js";
import { cleanChurchFields } from "../../lib/church-fields.js";
import { db, eq } from "../../lib/supabase.js";

export default async function handler(req, res) {
  const user = await requireAdmin(req, res);
  if (!user) return;
  if (req.method !== "GET" && req.method !== "PATCH") {
    res.setHeader("Allow", "GET, PATCH");
    res.status(405).json({ error: "Use GET or PATCH." });
    return;
  }
  try {
    const phone = new URL(req.url, "http://x").searchParams.get("phone");
    const [existing] = await db(`btw_churches?phone=${eq(phone || "")}&select=*,editor:btw_users(name)`);
    if (!existing) {
      res.status(404).json({ error: "No signup with that number." });
      return;
    }
    if (req.method === "GET") {
      res.status(200).json({ church: existing });
      return;
    }
    const { fields, error } = cleanChurchFields(req.body || {});
    if (error) {
      res.status(400).json({ error });
      return;
    }
    // The baptism count (as texted or set on the church's page): blank
    // clears it; a change records when, like a new report.
    const now = new Date().toISOString();
    if (req.body && "baptisms" in req.body) {
      const raw = String(req.body.baptisms ?? "").trim();
      const n = raw === "" ? null : Number(raw);
      if (n !== null && (!Number.isInteger(n) || n < 0 || n > 100000)) {
        res.status(400).json({ error: "Baptisms must be a whole number from 0 to 100000, or blank." });
        return;
      }
      if (n !== existing.baptisms) Object.assign(fields, { baptisms: n, baptisms_at: n === null ? null : now });
    }
    const [church] = await db(`btw_churches?phone=${eq(phone)}&select=*,editor:btw_users(name)`, {
      method: "PATCH",
      body: { ...fields, edited_by: user.id, edited_at: now },
      prefer: "return=representation",
    });
    res.status(200).json({ church });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
