// lib/admin-auth.js
// Login for the admin pages: one account per person in btw_users, all with
// the same rights.
//
// Logging in sets an HttpOnly cookie holding the user's id, their
// session_version, an expiry time and an HMAC of those keyed by
// ADMIN_PASSWORD. Every request checks the user is still active and the
// version still matches, so removing someone or changing their password
// signs them out everywhere. Changing ADMIN_PASSWORD signs everyone out.
//
// Before any user exists, ADMIN_PASSWORD itself logs in as "Setup", which
// can only be used to add the first users; it stops working once one does.
//
// Env vars:
//   ADMIN_PASSWORD  signs the session cookies; also the first-time setup password

import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { db, eq } from "./supabase.js";

const COOKIE = "btw_admin";
const MAX_AGE = 12 * 60 * 60; // seconds
const SETUP = "setup";
const scryptAsync = promisify(scrypt);

export const PASSWORD_MIN = 8;

// ---------- passwords ----------

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

async function verifyPassword(password, stored) {
  const [kind, salt, hash] = String(stored || "").split("$");
  if (kind !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const given = await scryptAsync(String(password), Buffer.from(salt, "base64"), expected.length);
  return timingSafeEqual(given, expected);
}

function setupPasswordMatches(given) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real || typeof given !== "string") return false;
  // Hash both so the comparison takes the same time whatever their lengths.
  return timingSafeEqual(sha256(given), sha256(real));
}

async function anyUsers() {
  const rows = await db("btw_users?active=eq.true&select=id&limit=1");
  return rows.length > 0;
}

// ---------- logging in and out ----------

// Checks an email and password and, when they're right, sets the session
// cookie. Returns the user ({ id, name, email, setup }) or null.
export async function logIn(res, email, password) {
  if (!process.env.ADMIN_PASSWORD) throw new Error("ADMIN_PASSWORD isn't set in Vercel, so nobody can log in yet.");
  if (typeof password !== "string" || !password) return null;

  if (!(await anyUsers())) {
    if (!setupPasswordMatches(password)) return null;
    setSessionCookie(res, SETUP, 0);
    return setupUser();
  }

  const [user] = await db(`btw_users?email=${eq(normalizeEmail(email))}&active=eq.true&select=id,name,email,password_hash,session_version`);
  if (!user || !(await verifyPassword(password, user.password_hash))) return null;
  setSessionCookie(res, user.id, user.session_version);
  await db(`btw_users?id=${eq(user.id)}`, { method: "PATCH", body: { last_login_at: new Date().toISOString() } });
  return publicUser(user);
}

export function logOut(res) {
  res.setHeader("Set-Cookie", cookie("", 0));
}

// The logged-in user, or null.
export async function currentUser(req) {
  if (!process.env.ADMIN_PASSWORD) return null;
  const [id, version, exp, sig] = (readCookie(req.headers.cookie, COOKIE) || "").split(".");
  if (!id || !sig || !(Number(exp) > Date.now() / 1000)) return null;
  const expected = Buffer.from(signature(id, version, exp));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;

  if (id === SETUP) return (await anyUsers()) ? null : setupUser();
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [user] = await db(`btw_users?id=${eq(id)}&active=eq.true&select=id,name,email,session_version`);
  if (!user || String(user.session_version) !== version) return null;
  return publicUser(user);
}

// Answers 401 and returns null when the request isn't logged in; otherwise
// returns the user. The setup login is refused (403) unless `allowSetup`:
// it's only for adding the first users.
export async function requireAdmin(req, res, { allowSetup = false } = {}) {
  const user = await currentUser(req).catch(() => null);
  if (!user) {
    res.status(401).json({ error: "Your session has ended. Log in again." });
    return null;
  }
  if (user.setup && !allowSetup) {
    res.status(403).json({ error: "Add your own user first, then log in with it." });
    return null;
  }
  return user;
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

const setupUser = () => ({ id: null, name: "Setup", email: null, setup: true });
const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, setup: false });

// ---------- the cookie ----------

export function setSessionCookie(res, id, version) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  res.setHeader("Set-Cookie", cookie(`${id}.${version}.${exp}.${signature(id, version, exp)}`, MAX_AGE));
}

function signature(id, version, exp) {
  return createHmac("sha256", process.env.ADMIN_PASSWORD).update(`btw-admin:${id}:${version}:${exp}`).digest("base64url");
}

function sha256(s) {
  return createHash("sha256").update(s).digest();
}

function cookie(value, maxAge) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`;
}

function readCookie(header = "", name) {
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}
