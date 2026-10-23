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
import { db, eq } from "../../lib/supabase.js";
import { US_STATES } from "../../public/js/engine.js";

const TEXT = ["name", "email", "church_name", "street", "city", "state", "zip", "denomination", "website",
  "contact_name", "contact_phone", "baptism_street", "baptism_city", "baptism_state", "baptism_zip"];
const BOOLEAN = ["baptism_same", "public_map"];
const REQUIRED = { name: "their name", church_name: "the church name" };

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
    const { fields, error } = clean(req.body || {});
    if (error) {
      res.status(400).json({ error });
      return;
    }
    const [church] = await db(`btw_churches?phone=${eq(phone)}&select=*,editor:btw_users(name)`, {
      method: "PATCH",
      body: { ...fields, edited_by: user.id, edited_at: new Date().toISOString() },
      prefer: "return=representation",
    });
    res.status(200).json({ church });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// The fields sent, tidied and checked the way the SMS signup checks them.
function clean(body) {
  const fields = {};
  for (const key of TEXT) {
    if (body[key] === undefined) continue;
    const v = String(body[key] ?? "").trim();
    fields[key] = v || null;
  }
  for (const key of BOOLEAN) {
    if (body[key] === undefined) continue;
    fields[key] = body[key] === null ? null : !!body[key];
  }

  for (const [key, what] of Object.entries(REQUIRED)) {
    if (key in fields && !fields[key]) return { error: `Enter ${what}.` };
  }
  if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) return { error: "That email doesn't look right." };
  for (const key of ["state", "baptism_state"]) {
    if (!fields[key]) continue;
    const s = fields[key].toUpperCase();
    const abbr = US_STATES[s] ? s : Object.keys(US_STATES).find((a) => US_STATES[a].toUpperCase() === s);
    if (!abbr) return { error: `"${fields[key]}" isn't a US state.` };
    fields[key] = abbr;
  }
  for (const key of ["zip", "baptism_zip"]) {
    if (fields[key] && !/^\d{5}$/.test(fields[key])) return { error: "ZIP codes have 5 digits." };
  }
  if (fields.contact_phone) {
    let d = fields.contact_phone.replace(/\D/g, "");
    if (d.length === 11 && d[0] === "1") d = d.slice(1);
    if (d.length !== 10) return { error: "The main contact's phone needs 10 digits." };
    fields.contact_phone = d;
  }
  if (fields.website) {
    if (!/\.[a-z]{2,}/i.test(fields.website) || /\s/.test(fields.website)) return { error: "That website doesn't look right." };
    if (!/^https?:\/\//i.test(fields.website)) fields.website = "https://" + fields.website;
  }
  if ("contact_name" in fields && !fields.contact_name) fields.contact_phone = null;
  if (fields.baptism_same === true) {
    fields.baptism_street = fields.baptism_city = fields.baptism_state = fields.baptism_zip = null;
  }
  return { fields };
}
