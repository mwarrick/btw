// /api/admin/simulations.js
// Made-up signups for showing the flow in /admin (see lib/simulations.js).
// Needs the admin session. Nothing is texted.
//
//   POST    -> { added }: replaces any simulations with fresh ones
//   DELETE  -> { removed }

import { requireAdmin } from "../../lib/admin-auth.js";
import { siteUrl } from "../../lib/profile-link.js";
import { addSimulations, removeSimulations } from "../../lib/simulations.js";

export default async function handler(req, res) {
  const user = await requireAdmin(req, res);
  if (!user) return;
  try {
    if (req.method === "POST") {
      res.status(200).json({ added: await addSimulations(user.id, siteUrl(req)) });
      return;
    }
    if (req.method === "DELETE") {
      res.status(200).json({ removed: await removeSimulations() });
      return;
    }
    res.setHeader("Allow", "POST, DELETE");
    res.status(405).json({ error: "Use POST or DELETE." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
