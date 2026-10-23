// lib/voipms.js
// Calls the voip.ms REST API, either directly or through a relay that has a
// fixed IP. voip.ms only accepts API calls from whitelisted IPs, and
// Vercel's outbound IPs change, so in production VOIPMS_API_URL points at
// the n8n relay (see relay/README.md), which forwards each call to voip.ms.
//
// Env vars:
//   VOIPMS_API_USERNAME  voip.ms account email
//   VOIPMS_API_PASSWORD  the API password (not the portal password)
//   VOIPMS_DID           the voip.ms number to send from, digits only
//   VOIPMS_API_URL       optional; the relay's webhook URL. Unset: call voip.ms directly
//   VOIPMS_RELAY_KEY     optional; the relay's shared secret, sent as X-Relay-Key

const DIRECT_URL = "https://voip.ms/api/v1/rest.php";
export const SMS_MAX = 160;
export const MMS_MAX = 2048;

// Calls one API method and returns voip.ms's JSON reply. Throws when the
// relay or voip.ms can't be reached or doesn't answer with JSON.
export async function voipms(method, params = {}) {
  const headers = { "Content-Type": "application/x-www-form-urlencoded" };
  if (process.env.VOIPMS_RELAY_KEY) headers["X-Relay-Key"] = process.env.VOIPMS_RELAY_KEY;

  const res = await fetch(process.env.VOIPMS_API_URL || DIRECT_URL, {
    method: "POST",
    headers,
    body: new URLSearchParams({
      // trimmed: a pasted value easily picks up a space or line break
      api_username: (process.env.VOIPMS_API_USERNAME || "").trim(),
      api_password: (process.env.VOIPMS_API_PASSWORD || "").trim(),
      method,
      ...params,
    }),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(res.ok ? "voip.ms didn't answer with JSON." : `The relay or voip.ms answered ${res.status}.`);
  }
  // Every voip.ms reply has a status. Anything else came from the relay
  // itself, e.g. n8n's "webhook is not registered" for an unpublished
  // workflow or a Test URL.
  if (data?.status === undefined) {
    throw new Error(`Unexpected reply (${res.status}): ${data?.message || JSON.stringify(data).slice(0, 200)}`);
  }
  return data;
}

// Sends a text: sendSMS when it fits in 160 characters, sendMMS for longer
// text (up to 2048) or attachments (up to 3 URLs). Returns { id, method }.
// When voip.ms refuses, throws an error whose `status` is voip.ms's reason,
// e.g. "ip_not_enabled" when the caller's IP isn't whitelisted.
export async function sendText(to, message = "", media = []) {
  const method = media.length > 0 || message.length > SMS_MAX ? "sendMMS" : "sendSMS";
  const params = { did: process.env.VOIPMS_DID || "", dst: to, message };
  media.forEach((url, i) => { params[`media${i + 1}`] = url; });

  const data = await voipms(method, params);
  if (data.status !== "success") {
    const err = new Error(data.status || "voip.ms returned an error.");
    err.status = data.status || "error";
    throw err;
  }
  return { id: data.sms ?? data.mms ?? null, method };
}
