// /api/admin/session.js
// Logging in to and out of the admin pages.
//
//   GET                         -> { loggedIn, user, setup }
//                                  setup: no users exist yet, so ADMIN_PASSWORD logs in to add the first
//   POST { email, password }    -> sets the session cookie: { loggedIn, user }
//   DELETE                      -> clears it
//
// See lib/admin-auth.js.

import { currentUser, logIn, logOut } from "../../lib/admin-auth.js";
import { db } from "../../lib/supabase.js";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const [user, users] = await Promise.all([
        currentUser(req).catch(() => null),
        db("btw_users?active=eq.true&select=id&limit=1"),
      ]);
      res.status(200).json({ loggedIn: !!user, user, setup: users.length === 0 });
      return;
    }
    if (req.method === "DELETE") {
      logOut(res);
      res.status(200).json({ loggedIn: false });
      return;
    }
    if (req.method !== "POST") {
      res.setHeader("Allow", "GET, POST, DELETE");
      res.status(405).json({ error: "Use GET, POST or DELETE." });
      return;
    }

    const user = await logIn(res, req.body?.email, req.body?.password);
    if (!user) {
      // Slows down guessing; serverless functions keep no count between requests.
      await new Promise((resolve) => setTimeout(resolve, 1000));
      res.status(401).json({ error: "That email and password don't match." });
      return;
    }
    res.status(200).json({ loggedIn: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
