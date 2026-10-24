// /api/profile-photos.js
// The Photos part of the pastor's page (/p/<key>#photos). The key from the
// signup link is the only login, as for api/profile.js.
//
//   GET ?key=...                 -> { photos: [{ id, url, thumb, created_at, ... }] } newest first;
//                                   links expire after an hour
//   POST ?key=... { image, thumb, width, height, consent: true }
//                                -> { photo }: one photo, base64 JPEG resized in the
//                                   browser; refused without consent. The permission
//                                   text they agreed to (web_consent in their
//                                   language) is saved with it.
//   DELETE ?key=...&id=...       -> { deleted }: removes that photo for good

import { isProfileKey } from "../lib/profile-link.js";
import { deletePhotos, listPhotos, savePhoto } from "../lib/photos.js";
import { logEvent } from "../lib/events.js";
import { db, eq } from "../lib/supabase.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!["GET", "POST", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST, DELETE");
    res.status(405).json({ error: "Use GET, POST or DELETE." });
    return;
  }
  try {
    const params = new URL(req.url, "http://x").searchParams;
    const key = params.get("key");
    const [church] = isProfileKey(key) ? await db(`btw_churches?profile_key=${eq(key)}&select=phone,lang`) : [];
    if (!church) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    if (req.method === "GET") {
      const photos = (await listPhotos({ phone: church.phone })).map(({ id, url, thumb, width, height, created_at }) => ({ id, url, thumb, width, height, created_at }));
      res.status(200).json({ photos });
      return;
    }

    if (req.method === "DELETE") {
      const deleted = await deletePhotos({ id: params.get("id"), phone: church.phone });
      res.status(deleted ? 200 : 404).json({ deleted });
      return;
    }

    const body = req.body || {};
    if (body.consent !== true) {
      res.status(400).json({ error: "consent" });
      return;
    }
    const lang = church.lang || "en";
    const rows = await db(`btw_prompts?key=eq.web_consent&lang=in.${encodeURIComponent(`(${[...new Set(["en", lang])].join(",")})`)}&select=lang,text`);
    const consentText = (rows.find((r) => r.lang === lang) || rows.find((r) => r.lang === "en"))?.text || "consent given";
    try {
      const photo = await savePhoto({ phone: church.phone, image: body.image, thumb: body.thumb, width: body.width, height: body.height, source: "web", consentText });
      res.status(200).json({ photo: { id: photo.id, created_at: photo.created_at } });
    } catch (err) {
      if (err.status !== 400) throw err;
      res.status(400).json({ error: err.message });
    }
  } catch (err) {
    console.error("profile-photos:", err.message);
    await logEvent("error", "profile-photos", `A pastor's photo request failed: ${err.message}`);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
