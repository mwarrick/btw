# btw: project notes

Goal: send and receive text messages through the voip.ms API, using Vercel serverless functions. Setup and usage are in `README.md`.

## Status
- `api/sms-send.js`: sends a text. POST with a Bearer `SMS_SEND_KEY`. Uses `sendSMS` for text of 160 characters or less, and `sendMMS` for longer text (up to 2048) or media (up to 3 URLs).
- `api/sms-inbound.js`: the voip.ms SMS URL callback. Checks `?key=SMS_INBOUND_KEY`, accepts GET (with `&` or `;` between values) or POST JSON, normalizes the message to `{id, from, to, message, date, media}`, logs it and replies `ok`.
- Both have only been tested with mocked requests and responses. They have **not** been run against real voip.ms: the cloud session that wrote them couldn't reach voip.ms.
- Stateless, like the original `crowdchirp/api/shorten.js` they were modelled on. No package.json and no dependencies; they rely on Node's built-in `fetch`.

## Open questions (verify against https://voip.ms/m/apidocs.php)
1. The format of the incoming callback: GET with placeholders, or POST JSON? Deploy, send a text to the DID and check the log line `Inbound SMS ...`. Then simplify `flattenBody` / `parseQuery` to match.
2. Does `rest.php` accept POST for `sendSMS`, or only GET? The code POSTs form-encoded data for both.
3. The response field holding the message id: `sms` for `sendSMS`, `mms` for `sendMMS`? The code assumes so.
4. Does `sendMMS` accept media URLs in `media1..3`, or only base64?
5. The exact placeholder names. `{TIMESTAMP}` vs `{DATE}` is unconfirmed.

## Next steps
- Decide where inbound messages go (store, forward, auto-reply). See the `TODO` in `sms-inbound.js`, and deduplicate on `id` because voip.ms retries.
- Get round the voip.ms IP whitelist for sending: Vercel's outbound IPs aren't fixed. Options: a static-IP relay (set `VOIPMS_API_URL`), Vercel's static IP option, or a whitelisted hostname.
- Register 10DLC (brand about $4 + campaign about $15, plus carrier fees) for US numbers.

## Research sources
- VoIP.ms wiki: API Overview https://wiki.voip.ms/article/API_Overview; SMS (Spanish) https://wiki.voip.ms/article/Mensajes_de_texto; 10DLC https://wiki.voip.ms/article/Regulaciones_y_requisitos_de_mensajer%C3%ADa_de_texto_comercial_10DLC
- API docs mirror: https://roism.net/drive/VoIPms-API-Documentation.html
- Example code: https://github.com/ikifar2012/VoIP.ms-Node.js-Example ; https://gist.github.com/dansleboby/e894efb2b8dba33bd0f8ef2c0b21ca1d
- Callback format notes (they conflict): https://deepwiki.com/simontelephonics/smsconnector/6.5-voip.ms (GET, `;`) vs https://www.fspbx.com/docs/configuration/messaging/voipms/ (POST JSON)
