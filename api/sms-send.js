// /api/sms-send.js
// Sends a text message through voip.ms (see lib/voipms.js for the env vars
// and the fixed-IP relay).
//
// POST /api/sms-send
//   Header:  Authorization: Bearer <SMS_SEND_KEY>
//   Body:    { "to": "5551234567", "message": "Hello", "media": ["https://..."] }
//
// Env vars:
//   SMS_SEND_KEY  shared secret so this isn't an open SMS relay

import { MMS_MAX, sendText } from "../lib/voipms.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Use POST." });
    return;
  }

  const auth = req.headers.authorization || "";
  if (!process.env.SMS_SEND_KEY || auth !== `Bearer ${process.env.SMS_SEND_KEY}`) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  const { to, message = "", media = [] } = req.body || {};
  const dst = String(to || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");

  if (dst.length !== 10) {
    res.status(400).json({ error: "Provide a 10-digit US/Canada number in `to`." });
    return;
  }
  if (!message && media.length === 0) {
    res.status(400).json({ error: "Provide a `message` or `media`." });
    return;
  }
  if (message.length > MMS_MAX) {
    res.status(400).json({ error: `Message is longer than ${MMS_MAX} characters.` });
    return;
  }
  if (!Array.isArray(media) || media.length > 3) {
    res.status(400).json({ error: "`media` must be an array of up to 3 URLs." });
    return;
  }

  try {
    res.status(200).json(await sendText(dst, message, media));
  } catch (err) {
    // err.status is voip.ms's reason, e.g. "ip_not_enabled" when the calling
    // IP isn't whitelisted; without it, voip.ms or the relay wasn't reached.
    if (err.status) res.status(502).json({ error: err.status });
    else res.status(500).json({ error: "Could not reach voip.ms: " + err.message });
  }
}
