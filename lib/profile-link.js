// lib/profile-link.js
// The link a pastor gets with the DONE message: /p/<key>, where the key is
// random (128 bits) and stored in btw_churches.profile_key. Whoever has the
// link can see and update that one signup, so it's only ever texted to the
// signup's own number.
//
// Env vars:
//   PUBLIC_SITE_URL  optional; the site's address for links, e.g. https://btw-dusky.vercel.app.
//                    Unset: the address the request came in on.

import { randomBytes } from "node:crypto";

export const newProfileKey = () => randomBytes(16).toString("base64url");

// A key as it may appear in a link: our 22-character keys, and the 32-hex
// ones the migration gave signups finished before links existed.
export const isProfileKey = (key) => /^[A-Za-z0-9_-]{20,64}$/.test(String(key || ""));

export function siteUrl(req) {
  if (process.env.PUBLIC_SITE_URL) return process.env.PUBLIC_SITE_URL.replace(/\/$/, "");
  const host = req?.headers?.["x-forwarded-host"] || req?.headers?.host || "btw-dusky.vercel.app";
  return `https://${host}`;
}

export const profileUrl = (site, key) => `${site}/p/${key}`;
