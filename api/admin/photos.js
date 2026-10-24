// /api/admin/photos.js
// Churches' photos for /admin. Needs the admin session.
//
//   GET               -> { photos: [...], unseen }: the latest 300 across every church, newest
//                        first, each with church_name, signed url and thumb (an hour)
//   GET ?phone=+1...  -> { photos }: that number's; marks them seen
//   DELETE ?id=...    -> { deleted }: removes a photo for good

import { requireAdmin } from "../../lib/admin-auth.js";
import { deletePhotos, listPhotos } from "../../lib/photos.js";
import { db, eq } from "../../lib/supabase.js";

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return;
  if (!["GET", "DELETE"].includes(req.method)) {
    res.setHeader("Allow", "GET, DELETE");
    res.status(405).json({ error: "Use GET or DELETE." });
    return;
  }
  try {
    const params = new URL(req.url, "http://x").searchParams;
    if (req.method === "DELETE") {
      const deleted = await deletePhotos({ id: params.get("id") });
      res.status(deleted ? 200 : 404).json({ deleted });
      return;
    }
    const phone = params.get("phone");
    if (phone) {
      const photos = await listPhotos({ phone });
      if (photos.some((p) => !p.seen_at)) {
        await db(`btw_photos?phone=${eq(phone)}&seen_at=is.null`, { method: "PATCH", body: { seen_at: new Date().toISOString() } });
      }
      res.status(200).json({ photos });
      return;
    }
    const photos = await listPhotos({ limit: 300 });
    const phones = [...new Set(photos.map((p) => p.phone))];
    const churches = phones.length
      ? await db(`btw_churches?phone=in.${encodeURIComponent(`(${phones.map((p) => `"${p}"`).join(",")})`)}&select=phone,church_name,name,simulated`)
      : [];
    const byPhone = new Map(churches.map((c) => [c.phone, c]));
    res.status(200).json({
      photos: photos.map((p) => ({ ...p, church_name: byPhone.get(p.phone)?.church_name || null, name: byPhone.get(p.phone)?.name || null })),
      unseen: photos.filter((p) => !p.seen_at).length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
