// lib/profile-link.js
// The link a pastor gets with the DONE message: /p/<key>, where the key is
// random (128 bits) and stored in btw_churches.profile_key. Whoever has the
// link can see and update that one signup, so it's only ever texted to the
// signup's own number.
//
// Env vars:
//   PUBLIC_SITE_URL  optional; the site's address for links. Unset: https://baptize.app
//                    on Vercel, the request's address locally.

import { randomBytes } from "node:crypto";
import { db, eq } from "./supabase.js";

export const newProfileKey = () => randomBytes(16).toString("base64url");

// A key as it may appear in a link: our 22-character keys, and the 32-hex
// ones the migration gave signups finished before links existed.
export const isProfileKey = (key) => /^[A-Za-z0-9_-]{20,64}$/.test(String(key || ""));

// The site's own domain, for links texted to pastors when PUBLIC_SITE_URL
// isn't set. Texts come in on the voip.ms callback's address
// (btw-dusky.vercel.app), so the request's host isn't the one to share.
export const SITE = "https://baptize.app";

export function siteUrl(req) {
  if (process.env.PUBLIC_SITE_URL) return process.env.PUBLIC_SITE_URL.replace(/\/$/, "");
  // Deployed on Vercel: always the real domain. Locally: the dev server.
  if (process.env.VERCEL) return SITE;
  const host = req?.headers?.["x-forwarded-host"] || req?.headers?.host || "baptize.app";
  return `https://${host}`;
}

export const profileUrl = (site, key) => `${site}/p/${key}`;

// The text that sends a pastor their page: login_link in their language
// (done_link where it's missing), with the link. Makes the key first if the
// signup has none. Used by Send login link in /admin and Get my link on /.
export async function linkText(phone, church, lang, site) {
  let key = church.profile_key;
  if (!key) {
    key = newProfileKey();
    await db(`btw_churches?phone=${eq(phone)}`, { method: "PATCH", body: { profile_key: key } });
  }
  const link = profileUrl(site, key);
  const langs = encodeURIComponent(`(${[...new Set(["en", lang])].join(",")})`);
  const rows = await db(`btw_prompts?key=in.(login_link,done_link)&lang=in.${langs}&select=key,lang,text`);
  const pick = (key, l) => rows.find((r) => r.key === key && r.lang === l)?.text;
  const template = pick("login_link", lang) || pick("login_link", "en") || pick("done_link", lang) || pick("done_link", "en") || "{link}";
  return template.includes("{link}") ? template.replace("{link}", link) : `${template}\n${link}`;
}
