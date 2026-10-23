// /api/admin/users.js
// The people who can use /admin. Everyone has the same rights, including
// adding and removing each other. Needs the admin session; the first-time
// setup login (see lib/admin-auth.js) may only add users.
//
//   GET                                 -> { users: [{ id, name, email, last_login_at, created_at }], me }
//   POST { name, email, password }      -> { user }: adds someone (or brings back someone removed)
//   PATCH { id, name?, password? }      -> { user }: renames, or sets a new password, which
//                                          signs that person out everywhere (but not you, if it's yours)
//   DELETE ?id=...                      -> { removed: true }: signs them out and stops their login;
//                                          the messages they sent keep their name

import { PASSWORD_MIN, hashPassword, normalizeEmail, requireAdmin, setSessionCookie } from "../../lib/admin-auth.js";
import { db, eq } from "../../lib/supabase.js";

const FIELDS = "id,name,email,last_login_at,created_at";

export default async function handler(req, res) {
  const me = await requireAdmin(req, res, { allowSetup: true });
  if (!me) return;
  if (me.setup && req.method !== "GET" && req.method !== "POST") {
    res.status(403).json({ error: "Add your own user first, then log in with it." });
    return;
  }
  try {
    if (req.method === "GET") return await list(me, res);
    if (req.method === "POST") return await add(req.body || {}, res);
    if (req.method === "PATCH") return await change(req.body || {}, me, res);
    if (req.method === "DELETE") return await remove(new URL(req.url, "http://x").searchParams.get("id"), me, res);
    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    res.status(405).json({ error: "Use GET, POST, PATCH or DELETE." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function list(me, res) {
  const users = await db(`btw_users?active=eq.true&select=${FIELDS}&order=name`);
  res.status(200).json({ users, me });
}

function checkPassword(password) {
  if (typeof password !== "string" || password.length < PASSWORD_MIN) return `Use a password of at least ${PASSWORD_MIN} characters.`;
  return null;
}

async function add(body, res) {
  const name = String(body.name || "").trim();
  const email = normalizeEmail(body.email);
  const problem = !name ? "Enter their name."
    : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "Enter a valid email address."
    : checkPassword(body.password);
  if (problem) {
    res.status(400).json({ error: problem });
    return;
  }

  const [existing] = await db(`btw_users?email=${eq(email)}&select=id,active,session_version`);
  if (existing?.active) {
    res.status(400).json({ error: "Someone with that email is already a user." });
    return;
  }
  const fields = { name, email, password_hash: await hashPassword(body.password), active: true };
  const [user] = existing
    ? await db(`btw_users?id=${eq(existing.id)}&select=${FIELDS}`, {
      method: "PATCH", body: { ...fields, session_version: existing.session_version + 1 }, prefer: "return=representation",
    })
    : await db(`btw_users?select=${FIELDS}`, { method: "POST", body: fields, prefer: "return=representation" });
  res.status(200).json({ user });
}

async function change(body, me, res) {
  const [target] = await db(`btw_users?id=${eq(String(body.id || ""))}&active=eq.true&select=id,session_version`);
  if (!target) {
    res.status(404).json({ error: "No such user." });
    return;
  }
  const fields = {};
  if (body.name !== undefined) {
    fields.name = String(body.name).trim();
    if (!fields.name) {
      res.status(400).json({ error: "Enter a name." });
      return;
    }
  }
  if (body.password !== undefined) {
    const problem = checkPassword(body.password);
    if (problem) {
      res.status(400).json({ error: problem });
      return;
    }
    fields.password_hash = await hashPassword(body.password);
    fields.session_version = target.session_version + 1;
  }
  if (!Object.keys(fields).length) {
    res.status(400).json({ error: "Send a new `name` or `password`." });
    return;
  }

  const [user] = await db(`btw_users?id=${eq(target.id)}&select=${FIELDS}`, { method: "PATCH", body: fields, prefer: "return=representation" });
  // Changing your own password shouldn't sign you out of this browser.
  if (fields.session_version && target.id === me.id) setSessionCookie(res, me.id, fields.session_version);
  res.status(200).json({ user });
}

async function remove(id, me, res) {
  if (id === me.id) {
    res.status(400).json({ error: "You can't remove yourself. Ask someone else to." });
    return;
  }
  const [target] = await db(`btw_users?id=${eq(String(id || ""))}&active=eq.true&select=id,session_version`);
  if (!target) {
    res.status(404).json({ error: "No such user." });
    return;
  }
  await db(`btw_users?id=${eq(target.id)}`, {
    method: "PATCH", body: { active: false, session_version: target.session_version + 1 },
  });
  res.status(200).json({ removed: true });
}
