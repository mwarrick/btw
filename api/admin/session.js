// /api/admin/session.js
// Logging in to and out of the admin pages.
//
//   GET                  -> { loggedIn }
//   POST { password }    -> sets the session cookie
//   DELETE               -> clears it
//
// Env vars:
//   ADMIN_PASSWORD  see lib/admin-auth.js

import { clearSessionCookie, isLoggedIn, passwordMatches, setSessionCookie } from "../../lib/admin-auth.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json({ loggedIn: isLoggedIn(req) });
    return;
  }
  if (req.method === "DELETE") {
    clearSessionCookie(res);
    res.status(200).json({ loggedIn: false });
    return;
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, DELETE");
    res.status(405).json({ error: "Use GET, POST or DELETE." });
    return;
  }

  if (!process.env.ADMIN_PASSWORD) {
    res.status(500).json({ error: "ADMIN_PASSWORD isn't set in Vercel, so nobody can log in yet." });
    return;
  }
  if (!passwordMatches(req.body?.password)) {
    // Slows down guessing; serverless functions keep no count between requests.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    res.status(401).json({ error: "That password isn't right." });
    return;
  }

  setSessionCookie(res);
  res.status(200).json({ loggedIn: true });
}
