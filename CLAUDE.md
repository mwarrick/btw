# btw: project notes

Goal: Baptize 2027 church signup, entirely by SMS through voip.ms, on Vercel serverless functions with Supabase. Churches pick a language, answer ~13 questions one text at a time, get a numbered summary, and can `EDIT <n>` any answer. Setup and usage are in `README.md`.

Live site: https://btw-dusky.vercel.app (Vercel project `btw`). Database: Supabase project `supabase-cobalt-saddle` (ref `jrkhnieyramucpegntln`), which is **shared with other apps**: everything of ours is prefixed `btw_`, and nothing else in it should be touched.

## Layout
- `public/`: the only folder Vercel publishes (`vercel.json` sets `outputDirectory`). Before that, the whole repo, `docs/` and `CLAUDE.md` included, was publicly downloadable. `cleanUrls` serves `admin.html` at `/admin`.
  - `index.html`: browser demo. Runs `js/engine.js` on the live prompts from `GET /api/prompts`, so edits at `/admin` show there (that endpoint is cached 15s at Vercel's edge).
  - `admin.html`: prompt editor (vanilla JS module, no build step).
  - `js/engine.js`: the conversation as a pure function, `reply(state, text) -> { state, replies }`. Shared by the demo and the SMS handler. State is JSON for `btw_sessions`; `data` uses `btw_churches` column names. The first message is `menu_intro`, then `<n> <menu_label>` per switched-on language, then `menu_footer`. After an opt-out (STOP and the other carrier words) it sends nothing until START.
  - `js/sms.js`: GSM-7 / Unicode segment counting, imported by the pages and by the API.
- `api/`: serverless functions. `api/admin/*` needs the `ADMIN_PASSWORD` session cookie.
- `lib/`: server helpers. `voipms.js` (voip.ms API calls and `sendText`, direct or via the relay), `supabase.js` (PostgREST over fetch), `events.js` (`logEvent()` into `btw_events` for the Log panel; never throws), `admin-auth.js` (HMAC cookie, no session store), `prompts.js` (English-only keys, quote straightening, placeholder checks, `loadPrompts()` for the engine), `translate.js` (Google v2 behind `translate()`).
- `supabase/migrations/`: schema and seed, already applied to the shared project.
- No package.json and no dependencies; everything relies on Node's built-in `fetch`.

## Status
- `api/sms-send.js`: sends a text. POST with a Bearer `SMS_SEND_KEY`. `sendText` uses `sendSMS` when the text fits one SMS segment (160 GSM-7 characters, but only 70 once any character needs Unicode, e.g. a language name in its own script), and `sendMMS` for anything longer (up to 2048) or media (up to 3 URLs). The first live reply failed with `sms_toolong` because the menu (all 10 languages on, native-script labels) was 136 Unicode characters sent as SMS.
- `api/sms-inbound.js`: the voip.ms SMS URL callback. Checks `?key=SMS_INBOUND_KEY`, accepts GET (with `&` or `;` between values) or POST JSON, normalizes the message to `{id, from, to, message, date, media}` and runs the conversation: any text to the number starts or continues that number's signup (no keyword; a new number's first text gets the language menu unless it's STOP). It records the text in `btw_messages` (a repeated voip.ms `id` is a retry and is ignored), loads `btw_sessions` + `btw_churches` for the phone (`+1XXXXXXXXXX`), runs `engine.reply`, saves both rows, then sends the replies through `sendText`. Answers live only in `btw_churches`; the session row holds phase, lang, queue, editing. `status` is `complete` from the first DONE until a restart, `opted_out` after STOP. A failed send is logged and not retried, since the state is already saved. Failures go to `btw_events` (see Log panel) and a reply that wasn't sent is kept in `btw_messages` with its `error`. Receiving confirmed live on 2026-10-23; the first reply failed (`sms_toolong`, fixed since).
- Prompt editor (`/admin`, `api/admin/*`): done, and working live against the real Supabase and Google Translate (login, loading prompts, Google drafts all confirmed in production). The user edits in English only: once an English prompt is saved and newer than a translation (by `updated_at`), it shows Translate, which calls `api/admin/translate-all` to translate and **save** into every language that is on or started, then shows the results in a dialog.
- Conversations panel (`/admin`, `api/admin/conversations.js`): lists every `btw_churches` row (newest activity first, status tabs, search) with where the person is from `btw_sessions`; clicking one opens its `btw_messages` thread as chat bubbles beside the saved answers. Read-only, with Refresh buttons (no auto-refresh). Unsent replies show dashed in red with the reason.
- Log panel (`/admin`, `api/admin/events.js`): the latest 200 `btw_events` rows (errors and warnings from `sms-inbound` and `sms-send`), with a link from a phone number to its conversation. Checked in a browser against an in-memory database, not yet against production.
- Prompt text is data: 88 keys in `btw_prompt_keys`, text per language in `btw_prompts`. Field order, validation and branching stay in code. Keys `menu_intro`, `menu_footer` and `menu_invalid` are English only (sent before a language is picked). Only English is active.

## Open questions (verify against https://voip.ms/m/apidocs.php)
1. ~~Format of the incoming callback~~: answered live. voip.ms sends GET with the placeholders filled in and `&` between them, e.g. `{"id":"113367333","from":"9498709493","to":"7147165116","message":"Hi 2","date":"2026-10-23 11:37:00"}` once normalized (`date` is local time, no zone). `flattenBody` / `parseQuery` could be simplified to match. One request took about 7 seconds end to end (incl. a relay send).
2. Does `rest.php` accept POST for `sendSMS`, or only GET? The code POSTs form-encoded data for both.
3. The response field holding the message id: `sms` for `sendSMS`, `mms` for `sendMMS`? The code assumes so.
4. Does `sendMMS` accept media URLs in `media1..3`, or only base64?
5. ~~Placeholder names~~: `{TO}`, `{FROM}`, `{MESSAGE}`, `{ID}`, `{TIMESTAMP}` all fill in.

## Next steps
- SMS URL Callback is set on the DID (7147165116) and receiving works. Confirm a whole signup end to end now that long Unicode replies go as MMS.
- Maybe: a "finish on the web" link (signed, texted on request) that edits the same `btw_churches` row.
- voip.ms IP whitelist: sending goes through an n8n relay at https://n8n.markwarrick.org (`relay/`; `lib/voipms.js` sends `X-Relay-Key`). Vercel Static IPs were rejected at $100/month. The site is behind Cloudflare, so the IP to whitelist is the server's own outbound IP, not what the hostname resolves to: **76.175.179.85** (Spectrum residential, unchanged for years per the user). If sending starts failing with `ip_not_enabled`, check `curl https://api.ipify.org` on the server first. `/admin` has a Text messaging panel (`api/admin/sms-check.js`) that checks the relay (`getIP`), credentials and whitelist (`getBalance`), and sends a test text. Working in production as of 2026-10-23: workflow published, IP whitelisted, `VOIPMS_API_URL` = `https://n8n.markwarrick.org/webhook/voipms-relay` (Production, not `/webhook-test/`), all three checks green, and a test text from /admin arrived on the user's phone.
- Register 10DLC (brand about $4 + campaign about $15, plus carrier fees) for US numbers.

## Research sources
- VoIP.ms wiki: API Overview https://wiki.voip.ms/article/API_Overview; SMS (Spanish) https://wiki.voip.ms/article/Mensajes_de_texto; 10DLC https://wiki.voip.ms/article/Regulaciones_y_requisitos_de_mensajer%C3%ADa_de_texto_comercial_10DLC
- API docs mirror: https://roism.net/drive/VoIPms-API-Documentation.html
- Example code: https://github.com/ikifar2012/VoIP.ms-Node.js-Example ; https://gist.github.com/dansleboby/e894efb2b8dba33bd0f8ef2c0b21ca1d
- Callback format notes (they conflict): https://deepwiki.com/simontelephonics/smsconnector/6.5-voip.ms (GET, `;`) vs https://www.fspbx.com/docs/configuration/messaging/voipms/ (POST JSON)
