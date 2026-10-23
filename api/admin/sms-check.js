// /api/admin/sms-check.js
// Connection checks for the editor's "Text messaging" panel. Needs the
// admin session. Every call goes the same way a real text does: through
// lib/voipms.js, so through the n8n relay when one is configured.
//
//   GET                  -> { relay, ip, account, number }
//     relay:   { configured, url, keySet }
//     ip:      { ok, ip }      voip.ms's getIP: the address it sees calling
//     account: { ok, balance } getBalance: works only with valid credentials
//                              from a whitelisted IP
//     number:  { ok, did, found, sms, description } the DID texts come from
//                              (VOIPMS_DID), checked with getDIDsInfo
//     A failed check has { ok: false, error } instead.
//   POST { to, message } -> sends a test text: { ok, id, method } or { ok: false, error }

import { requireAdmin } from "../../lib/admin-auth.js";
import { explainStatus, sendText, voipms } from "../../lib/voipms.js";

export default async function handler(req, res) {
  if (!(await requireAdmin(req, res))) return;
  if (req.method === "GET") return check(res);
  if (req.method === "POST") return sendTest(req, res);
  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: "Use GET or POST." });
}

async function check(res) {
  const url = process.env.VOIPMS_API_URL || "";
  const relay = {
    configured: !!url,
    url: url || null,
    keySet: !!process.env.VOIPMS_RELAY_KEY,
    // n8n's Test URL only answers while the editor is listening.
    testUrl: url.includes("/webhook-test/"),
  };

  const did = (process.env.VOIPMS_DID || "").replace(/\D/g, "");
  const [ip, account, number] = await Promise.all([
    call("getIP", (d) => ({ ip: d.ip })),
    call("getBalance", (d) => ({ balance: d.balance?.current_balance ?? null })),
    did ? call("getDIDsInfo", (d) => didInfo(d, did), { did })
      : { ok: false, error: "VOIPMS_DID isn't set in Vercel, so texts have no number to come from." },
  ]);
  number.did = did || null;
  if (number.ok && !number.found) {
    number.ok = false;
    number.error = "voip.ms doesn't list this number on the account.";
  } else if (number.ok && number.sms === false) {
    number.ok = false;
    number.error = "SMS isn't enabled on this number in voip.ms.";
  } else if (number.status === "invalid_did") {
    number.error = "voip.ms doesn't list this number on the account.";
  }
  // Name the account voip.ms rejected (never the password).
  if (account.status === "invalid_credentials") {
    const user = (process.env.VOIPMS_API_USERNAME || "").trim();
    account.error = `voip.ms didn't accept the API password for "${user}". The username must be the email you log in to voip.ms with, and the password the API password saved under Main Menu, SOAP & REST/JSON API (not your portal password).`;
  }
  // When voip.ms rejects the IP, say which one it saw.
  if (account.status === "ip_not_enabled" && ip.ok) {
    account.error = `voip.ms refused ${ip.ip}. Add that IP in voip.ms under Main Menu, SOAP & REST/JSON API.`;
  }
  res.status(200).json({ relay, ip, account, number });
}

// getDIDsInfo's entry for the DID: whether it's on the account, whether SMS
// is on (unknown when voip.ms doesn't say), and its description.
function didInfo(data, did) {
  const entry = (data.dids || []).find((d) => String(d.did).replace(/\D/g, "").endsWith(did));
  if (!entry) return { found: false };
  const sms = entry.sms_enabled == null ? null : String(entry.sms_enabled) === "1";
  return { found: true, sms, description: entry.description || null };
}

async function call(method, pick, params) {
  try {
    const data = await voipms(method, params);
    if (data.status === "success") return { ok: true, ...pick(data) };
    return { ok: false, status: data.status, error: explainStatus(data.status) };
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
      error: err.status ? explainStatus(err.status) : `Couldn't reach ${process.env.VOIPMS_API_URL ? "the relay" : "voip.ms"}: ${err.message}`,
    });
  }
}
