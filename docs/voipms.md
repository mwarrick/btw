# voip.ms: sending, receiving and open questions

Setup steps (API password, callback URL, MMS, 10DLC) are in `README.md`. How texts are handled is in [features/sms-signup.md](features/sms-signup.md).

## Sending through the relay

- voip.ms only accepts API calls from whitelisted IPs, so sending goes through an n8n relay at https://n8n.markwarrick.org (`relay/`; `lib/voipms.js` sends `X-Relay-Key`). Vercel Static IPs were rejected at $100/month.
- The site is behind Cloudflare, so the IP to whitelist is the server's own outbound IP, not what the hostname resolves to: **76.175.179.85** (Spectrum residential, unchanged for years per the user). If sending starts failing with `ip_not_enabled`, check `curl https://api.ipify.org` on the server first.
- `/admin` has a Connection screen (`api/admin/sms-check.js`) that checks the relay (`getIP`), credentials and whitelist (`getBalance`), shows the DID texts come from (`VOIPMS_DID`, confirmed on the account with `getDIDsInfo`, with its SMS setting and description), and sends a test text. Working in production as of 2026-10-23.
- Which numbers we can text is `canText` in `lib/voipms.js` (US and Canada today), so switching provider changes only that file.

## Open questions (verify against https://voip.ms/m/apidocs.php)

1. ~~Format of the incoming callback~~: answered live. voip.ms sends GET with the placeholders filled in and `&` between them, e.g. `{"id":"113367333","from":"9498709493","to":"7147165116","message":"Hi 2","date":"2026-10-23 11:37:00"}` once normalized (`date` is local time, no zone). `flattenBody` / `parseQuery` could be simplified to match. One request took about 7 seconds end to end (incl. a relay send).
2. Does `rest.php` accept POST for `sendSMS`, or only GET? The code POSTs form-encoded data for both.
3. The response field holding the message id: `sms` for `sendSMS`, `mms` for `sendMMS`? The code assumes so.
4. Does `sendMMS` accept media URLs in `media1..3`, or only base64? (Needed before reviewers can send pictures.)
5. ~~Placeholder names~~: `{TO}`, `{FROM}`, `{MESSAGE}`, `{ID}`, `{TIMESTAMP}` all fill in.
6. How long do the `{MEDIA}` links stay up, and do they need a login? Check with a real MMS: if the thumbnail in /admin doesn't load, the links aren't public.

## To do

- Simplify `flattenBody` / `parseQuery` in `sms-inbound.js` for the confirmed GET format. One live request took about 7 seconds; watch for voip.ms retries.
- Register 10DLC (brand about $4 + campaign about $15, plus carrier fees) for US numbers.

## Research sources

- VoIP.ms wiki: API Overview https://wiki.voip.ms/article/API_Overview; SMS (Spanish) https://wiki.voip.ms/article/Mensajes_de_texto; 10DLC https://wiki.voip.ms/article/Regulaciones_y_requisitos_de_mensajer%C3%ADa_de_texto_comercial_10DLC
- API docs mirror: https://roism.net/drive/VoIPms-API-Documentation.html
- Example code: https://github.com/ikifar2012/VoIP.ms-Node.js-Example ; https://gist.github.com/dansleboby/e894efb2b8dba33bd0f8ef2c0b21ca1d
- Callback format notes (they conflict): https://deepwiki.com/simontelephonics/smsconnector/6.5-voip.ms (GET, `;`) vs https://www.fspbx.com/docs/configuration/messaging/voipms/ (POST JSON)
