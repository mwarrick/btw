# btw: project notes

Goal: Baptize 2027 church signup, entirely by SMS through voip.ms, on Vercel serverless functions with Supabase. Churches pick a language, answer ~13 questions one text at a time, get a numbered summary, and can `EDIT <n>` any answer. Setup and usage are in `README.md`.

Live site: https://btw-dusky.vercel.app (Vercel project `btw`). Database: Supabase project `supabase-cobalt-saddle` (ref `jrkhnieyramucpegntln`), which is **shared with other apps**: everything of ours is prefixed `btw_`, and nothing else in it should be touched.

## Layout
- `public/`: the only folder Vercel publishes (`vercel.json` sets `outputDirectory`). Before that, the whole repo, `docs/` and `CLAUDE.md` included, was publicly downloadable. `cleanUrls` serves `admin.html` at `/admin`.
  - `index.html`: browser demo of the English conversation. Its logic is still inline; it should move to a shared engine that the SMS handler also uses.
  - `admin.html`: prompt editor (vanilla JS module, no build step).
  - `js/sms.js`: GSM-7 / Unicode segment counting, imported by the pages and by the API.
- `api/`: serverless functions. `api/admin/*` needs the `ADMIN_PASSWORD` session cookie.
- `lib/`: server helpers. `supabase.js` (PostgREST over fetch), `admin-auth.js` (HMAC cookie, no session store), `prompts.js` (English-only keys, quote straightening, placeholder checks), `translate.js` (Google v2 behind `translate()`).
- `supabase/migrations/`: schema and seed, already applied to the shared project.
- No package.json and no dependencies; everything relies on Node's built-in `fetch`.

## Status
- `api/sms-send.js`: sends a text. POST with a Bearer `SMS_SEND_KEY`. Uses `sendSMS` for text of 160 characters or less, and `sendMMS` for longer text (up to 2048) or media (up to 3 URLs).
- `api/sms-inbound.js`: the voip.ms SMS URL callback. Checks `?key=SMS_INBOUND_KEY`, accepts GET (with `&` or `;` between values) or POST JSON, normalizes the message to `{id, from, to, message, date, media}`, logs it and replies `ok`. It does not run the conversation yet.
- Neither has been run against real voip.ms.
- Prompt editor (`/admin`, `api/admin/*`): done and tested locally against PGlite with the real migrations and a fake Google. Not yet tried against the real Supabase or Google.
- Prompt text is data: 88 keys in `btw_prompt_keys`, text per language in `btw_prompts`. Field order, validation and branching stay in code. Keys `menu_intro`, `menu_footer` and `menu_invalid` are English only (sent before a language is picked). Only English is active.

## Open questions (verify against https://voip.ms/m/apidocs.php)
1. The format of the incoming callback: GET with placeholders, or POST JSON? Deploy, send a text to the DID and check the log line `Inbound SMS ...`. Then simplify `flattenBody` / `parseQuery` to match.
2. Does `rest.php` accept POST for `sendSMS`, or only GET? The code POSTs form-encoded data for both.
3. The response field holding the message id: `sms` for `sendSMS`, `mms` for `sendMMS`? The code assumes so.
4. Does `sendMMS` accept media URLs in `media1..3`, or only base64?
5. The exact placeholder names. `{TIMESTAMP}` vs `{DATE}` is unconfirmed.

## Next steps
- Build the conversation handler: factor the state machine out of `public/index.html` into a shared engine, have `sms-inbound.js` run it against `btw_sessions` / `btw_churches`, read text from `btw_prompts` (falling back to English), log to `btw_messages` and deduplicate on the voip.ms `id`.
- Get round the voip.ms IP whitelist for sending: Vercel's outbound IPs aren't fixed. Options: a static-IP relay (set `VOIPMS_API_URL`), Vercel's static IP option, or a whitelisted hostname.
- Register 10DLC (brand about $4 + campaign about $15, plus carrier fees) for US numbers.

## Research sources
- VoIP.ms wiki: API Overview https://wiki.voip.ms/article/API_Overview; SMS (Spanish) https://wiki.voip.ms/article/Mensajes_de_texto; 10DLC https://wiki.voip.ms/article/Regulaciones_y_requisitos_de_mensajer%C3%ADa_de_texto_comercial_10DLC
- API docs mirror: https://roism.net/drive/VoIPms-API-Documentation.html
- Example code: https://github.com/ikifar2012/VoIP.ms-Node.js-Example ; https://gist.github.com/dansleboby/e894efb2b8dba33bd0f8ef2c0b21ca1d
- Callback format notes (they conflict): https://deepwiki.com/simontelephonics/smsconnector/6.5-voip.ms (GET, `;`) vs https://www.fspbx.com/docs/configuration/messaging/voipms/ (POST JSON)
