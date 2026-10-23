// lib/admin-auth.js
// Login for the admin pages: one shared password.
//
// Logging in sets an HttpOnly cookie holding an expiry time and an HMAC of
// it keyed by the password. No session store is needed, and changing
// ADMIN_PASSWORD logs everyone out.
//
// Env vars:
//   ADMIN_PASSWORD  the password for /admin

import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "btw_admin";
const MAX_AGE = 12 * 60 * 60; // seconds

export function passwordMatches(given) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real || typeof given !== "string") return false;
  // Hash both so the comparison takes the same time whatever their lengths.
  return timingSafeEqual(sha256(given), sha256(real));
}

export function setSessionCookie(res) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  res.setHeader("Set-Cookie", cookie(`${exp}.${signature(exp)}`, MAX_AGE));
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", cookie("", 0));
}

export function isLoggedIn(req) {
  if (!process.env.ADMIN_PASSWORD) return false;
  const [exp, sig] = (readCookie(req.headers.cookie, COOKIE) || "").split(".");
  if (!exp || !sig || !(Number(exp) > Date.now() / 1000)) return false;
  const expected = Buffer.from(signature(exp));
  const given = Buffer.from(sig);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Answers 401 and returns false when the request isn't logged in.
export function requireAdmin(req, res) {
  if (isLoggedIn(req)) return true;
  res.status(401).json({ error: "Your session has ended. Log in again." });
  return false;
}

function signature(exp) {
  return createHmac("sha256", process.env.ADMIN_PASSWORD).update(`btw-admin:${exp}`).digest("base64url");
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
