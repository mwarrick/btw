// lib/photos.js
// Churches' photos: the files in the private btw-photos bucket and a
// btw_photos row each. Used by the pastor's page (api/profile-photos.js),
// /admin (api/admin/photos.js) and deleting a conversation.
//
// From the page: <phone digits>/<random>.jpg plus a small <random>_t.jpg
// for the grid, both made in the browser (resized, re-encoded as JPEG, so a
// phone's location data is dropped), with permission given on upload.
// By text (MMS): the picture as voip.ms has it, copied out of voip.ms, with
// no thumbnail; permission is asked by text (consent_at once they answer
// YES, declined_at for NO). Removing a photo deletes its files and row for
// good.

import { randomBytes } from "node:crypto";
import { db, eq } from "./supabase.js";
import { putObject, removeObjects, signUrls } from "./storage.js";

export const BUCKET = "btw-photos";
// A resized photo is well under this; Vercel refuses requests over 4.5 MB.
const MAX_BYTES = 3 * 1024 * 1024;
const FIELDS = "id,phone,thumb_path,path,source,width,height,consent_at,declined_at,seen_at,created_at";
// Picture types kept from texts, by their first bytes.
const SNIFF = [
  ["image/jpeg", "jpg", (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  ["image/png", "png", (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47],
  ["image/gif", "gif", (b) => b.subarray(0, 4).toString("latin1") === "GIF8"],
  ["image/webp", "webp", (b) => b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP"],
];
const MMS_MAX_BYTES = 5 * 1024 * 1024; // the bucket's limit

// The photos of one number (or the latest across all), newest first, each
// with signed `url` and `thumb` links.
export async function listPhotos({ phone, limit = 500 } = {}) {
  const rows = await db(`btw_photos?select=${FIELDS}${phone ? `&phone=${eq(phone)}` : ""}&order=id.desc&limit=${limit}`);
  const links = await signUrls(BUCKET, rows.flatMap((r) => [r.path, r.thumb_path].filter(Boolean)));
  return rows.map(({ path, thumb_path, ...r }) => ({ ...r, url: links[path] || null, thumb: links[thumb_path] || links[path] || null }));
}

// Saves one photo sent as base64 JPEG (`image`, optional `thumb`). Returns
// the row, or throws an Error with `status` 400 for a file that isn't one.
export async function savePhoto({ phone, image, thumb, width, height, source, consentText, userId }) {
  const full = decode(image);
  const small = thumb ? decode(thumb) : null;
  const name = randomBytes(12).toString("base64url");
  const dir = phone.replace(/\D/g, "");
  const path = `${dir}/${name}.jpg`;
  const thumbPath = small ? `${dir}/${name}_t.jpg` : null;
  await putObject(BUCKET, path, full, "image/jpeg");
  if (small) await putObject(BUCKET, thumbPath, small, "image/jpeg");
  try {
    const [row] = await db(`btw_photos?select=${FIELDS}`, {
      method: "POST",
      body: {
        phone, path, thumb_path: thumbPath, source, content_type: "image/jpeg", bytes: full.length,
        width: Number(width) || null, height: Number(height) || null,
        consent_at: consentText ? new Date().toISOString() : null, consent_text: consentText || null,
        uploaded_by: userId || null,
      },
      prefer: "return=representation",
    });
    return row;
  } catch (err) {
    await removeObjects(BUCKET, [path, thumbPath].filter(Boolean)).catch(() => {});
    throw err;
  }
}

// Copies a text's pictures out of voip.ms into the bucket, waiting for
// permission. Anything that isn't a picture (a video, a contact card) or
// can't be fetched stays only as the link on the message. Returns
// { saved, ids, skipped: [reasons] }.
export async function savePhotosFromText({ phone, messageId, urls }) {
  const dir = phone.replace(/\D/g, "");
  const ids = [];
  const skipped = [];
  for (const url of urls) {
    try {
      const res = await fetch(url);
      if (!res.ok) { skipped.push(`voip.ms answered ${res.status} for ${url}`); continue; }
      const bytes = Buffer.from(await res.arrayBuffer());
      const kind = SNIFF.find(([, , test]) => bytes.length > 12 && test(bytes));
      if (!kind) { skipped.push(`not a picture: ${url}`); continue; }
      if (bytes.length > MMS_MAX_BYTES) { skipped.push(`over 5 MB: ${url}`); continue; }
      const path = `${dir}/${randomBytes(12).toString("base64url")}.${kind[1]}`;
      await putObject(BUCKET, path, bytes, kind[0]);
      const [row] = await db("btw_photos?select=id", {
        method: "POST",
        body: { phone, path, source: "sms", content_type: kind[0], bytes: bytes.length, message_id: messageId },
        prefer: "return=representation",
      });
      ids.push(row.id);
    } catch (err) {
      skipped.push(`${err.message}: ${url}`);
    }
  }
  return { saved: ids.length, ids, skipped };
}

// Texted photos still waiting for a YES or NO.
export function pendingPhotos(phone) {
  return db(`btw_photos?phone=${eq(phone)}&source=eq.sms&consent_at=is.null&declined_at=is.null&select=id`);
}

// Their answer to the permission question, for every photo waiting on it.
// `question` and `reply` are kept as the record of what they agreed to.
export function answerPhotos(phone, yes, question, reply) {
  const now = new Date().toISOString();
  return db(`btw_photos?phone=${eq(phone)}&source=eq.sms&consent_at=is.null&declined_at=is.null`, {
    method: "PATCH",
    body: yes ? { consent_at: now, consent_text: `${question}\n→ ${reply}` } : { declined_at: now },
  });
}

// Deletes photos for good: `id` (one, optionally only if it's that
// number's) or every photo of `phone`. Returns how many.
export async function deletePhotos({ id, phone }) {
  const filter = id ? `id=eq.${Number(id)}${phone ? `&phone=${eq(phone)}` : ""}` : `phone=${eq(phone)}`;
  const rows = await db(`btw_photos?${filter}&select=id,path,thumb_path`);
  if (!rows.length) return 0;
  await removeObjects(BUCKET, rows.flatMap((r) => [r.path, r.thumb_path].filter(Boolean)));
  await db(`btw_photos?id=in.(${rows.map((r) => r.id).join(",")})`, { method: "DELETE" });
  return rows.length;
}

function decode(b64) {
  const bytes = Buffer.from(String(b64 || "").replace(/^data:[^,]*,/, ""), "base64");
  // JPEG files start FF D8 FF.
  if (bytes.length < 100 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
    throw Object.assign(new Error("That isn't a JPEG photo."), { status: 400 });
  }
  if (bytes.length > MAX_BYTES) throw Object.assign(new Error("That photo is too big."), { status: 400 });
  return bytes;
}
