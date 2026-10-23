// /api/admin/sms-check.js
// Connection checks for the editor's "Text messaging" panel. Needs the
// admin session. Every call goes the same way a real text does: through
// lib/voipms.js, so through the n8n relay when one is configured.
//
//   GET                  -> { relay, ip, account }
//     relay:   { configured, url, keySet }
//     ip:      { ok, ip }      voip.ms's getIP: the address it sees calling
//     account: { ok, balance } getBalance: works only with valid credentials
//                              from a whitelisted IP
//     A failed check has { ok: false, error } instead.
//   POST { to, message } -> sends a test text: { ok, id, method } or { ok: false, error }

import { requireAdmin } from "../../lib/admin-auth.js";
import { sendText, voipms } from "../../lib/voipms.js";

// voip.ms status codes, in words.
const REASONS = {
  ip_not_enabled: "voip.ms refused the caller's IP. Add it in voip.ms under Main Menu, SOAP & REST/JSON API.",
  invalid_credentials: "voip.ms didn't accept the API username or password (VOIPMS_API_USERNAME / VOIPMS_API_PASSWORD).",
  missing_credentials: "VOIPMS_API_USERNAME or VOIPMS_API_PASSWORD isn't set in Vercel.",
  api_not_enabled: "The API isn't enabled in the voip.ms portal.",
  invalid_did: "VOIPMS_DID isn't one of your voip.ms numbers, or SMS isn't enabled on it.",
  invalid_dst: "voip.ms didn't accept that phone number.",
  sms_failed: "voip.ms couldn't send the text.",
};

const explain = (status) => REASONS[status] || `voip.ms said: ${status}`;

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method === "GET") return check(res);
  if (req.method === "POST") return sendTest(req, res);
  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: "Use GET or POST." });
}

async function check(res) {
  const url = process.env.VOIPMS_API_URL || "";
  const relay = { configured: !!url, url: url || null, keySet: !!process.env.VOIPMS_RELAY_KEY };

  const [ip, account] = await Promise.all([
    call("getIP", (d) => ({ ip: d.ip })),
    call("getBalance", (d) => ({ balance: d.balance?.current_balance ?? null })),
  ]);
  // When voip.ms rejects the IP, say which one it saw.
  if (account.status === "ip_not_enabled" && ip.ok) {
    account.error = `voip.ms refused ${ip.ip}. Add that IP in voip.ms under Main Menu, SOAP & REST/JSON API.`;
  }
  res.status(200).json({ relay, ip, account });
}

async function call(method, pick) {
  try {
    const data = await voipms(method);
    if (data.status === "success") return { ok: true, ...pick(data) };
    return { ok: false, status: data.status, error: explain(data.status) };
  } catch (err) {
    return { ok: false, error: `Couldn't reach ${process.env.VOIPMS_API_URL ? "the relay" : "voip.ms"}: ${err.message}` };
  }
}

async function sendTest(req, res) {
  const to = String(req.body?.to || "").replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  const message = String(req.body?.message || "").trim() || "Test message from the btw admin page.";
  if (to.length !== 10) {
    res.status(400).json({ ok: false, error: "Enter a 10-digit US or Canadian mobile number." });
    return;
  }
  if (message.length > 160) {
    res.status(400).json({ ok: false, error: "Keep the test message to 160 characters." });
    return;
  }
  try {
    const sent = await sendText(to, message);
    res.status(200).json({ ok: true, ...sent });
  } catch (err) {
    res.status(200).json({
      ok: false,
      error: err.status ? explain(err.status) : `Couldn't reach ${process.env.VOIPMS_API_URL ? "the relay" : "voip.ms"}: ${err.message}`,
    });
  }
}
