# Setup and technical overview

How the site is put together and how to run it. What each feature does is in [features/](features/); the database is in [schema.md](schema.md).

The site runs on Vercel serverless functions with a Supabase database and texts through [voip.ms](https://voip.ms). There's no build step, no `package.json` and no dependencies: everything uses Node's built-in `fetch`. Only `public/` is published as the website (see `vercel.json`).

## Pages

| Path | What it is |
| --- | --- |
| `/` | The front page: church organizers (sign up, text us, Get my link), the baptized (share your story, first 30 days), the team (`/admin`) |
| `/features` | "How it works", in every switched-on language |
| `/signup` | The web signup form; confirms the phone with a texted 6-digit code |
| `/p/<key>` | A church's own page: answers, photos, baptism count, resources, stories, newly baptized. The key in the link is the only login. |
| `/story`, `/s/<key>`, `/g/<key>` | Baptism stories: start, write (private link), and a parent's approval link |
| `/journey`, `/j/<key>` | The first 30 days: start, and the person's own days |
| `/demo` | A browser demo of the text signup. Nothing is saved or sent. |
| `/admin` | The team's "SMS Gateway": Conversations, Churches, Photos, Baptisms, Testimonies, Discipleship, and under Settings: Prompts, Languages, Log, Users, Connection. Each person logs in with their own email and password. |

## API

| Path | What it does |
| --- | --- |
| `GET/POST /api/sms-inbound` | voip.ms calls this when a text arrives; it runs the conversation and texts the replies |
| `POST /api/sms-send` | Sends an SMS or MMS from the voip.ms number (Bearer `SMS_SEND_KEY`) |
| `GET /api/prompts` | The live wording, for `/demo` |
| `/api/profile` | The church page's data and saves, the web signup, Get my link, the front page's and "How it works" wording |
| `/api/profile-photos` | The church page's Photos tab: list, upload, delete, photo permission |
| `/api/story` | Stories: start, link, save, delete, parent's approval |
| `/api/journey` | The first 30 days: start, days, check-ins |
| `/api/admin/*` | The team's API: `session`, `users`, `conversations`, `churches`, `photos`, `testimonies`, `journeys`, `simulations`, `prompts`, `languages`, `translate`, `translate-all`, `events`, `sms-check` |

## Environment variables

| Name | What it is |
| --- | --- |
| `VOIPMS_API_USERNAME` | Your voip.ms account email |
| `VOIPMS_API_PASSWORD` | The API password, which is separate from your portal password |
| `VOIPMS_DID` | Your voip.ms number to send from, as 10 digits |
| `SMS_SEND_KEY` | Shared secret that callers of `/api/sms-send` must send |
| `SMS_INBOUND_KEY` | Shared secret in the voip.ms callback URL |
| `VOIPMS_API_URL` | The n8n relay's webhook URL (see `relay/README.md`). Unset: call voip.ms directly, which fails from Vercel. |
| `VOIPMS_RELAY_KEY` | The relay's shared secret, sent as the `X-Relay-Key` header |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | The service role (secret) key. Server-side only. |
| `ADMIN_PASSWORD` | Signs the `/admin` session cookies, so changing it logs everyone out. Before any user exists it's also the setup password that logs in to add the first one. |
| `GOOGLE_TRANSLATE_API_KEY` | API key restricted to the Cloud Translation API, for translations and language detection |
| `TRANSLATE_PROVIDER` | Optional: `google` (the default and only option so far) |
| `WEB_TEXTS_PER_DAY` | Optional: the most texts the web pages may send in 24 hours (default 300). Past it they stop sending and an error shows in the Log panel. |
| `PUBLIC_SITE_URL` | Optional: the address used in texted links. Unset: `https://baptize.app` (on Vercel). |

## Database

The schema and seed are in `supabase/migrations/`; the current tables, a diagram and how they link are in [schema.md](schema.md) and `supabase/schema.sql`. Every table is prefixed `btw_` because the Supabase project is shared with other apps. Row level security is on with no policies, so only the service role key reaches the data.

## voip.ms setup

1. In the voip.ms portal, go to the API settings. Set an API password, turn API access on, and whitelist the IP that will call the API (the relay server's; see below).
2. Edit your DID and turn on SMS and MMS. Set the **SMS URL Callback** to:

   ```
   https://<your-site>/api/sms-inbound?key=<SMS_INBOUND_KEY>&to={TO}&from={FROM}&message={MESSAGE}&id={ID}&date={TIMESTAMP}&media={MEDIA}
   ```

   Keep `&media={MEDIA}` last: it's the MMS attachments (comma-separated links), and everything after `media=` is read as that list. Turn on **URL callback retry** too: voip.ms keeps retrying until the endpoint replies `ok`.
3. US numbers: register a brand and a campaign for 10DLC in the portal. Carriers filter unregistered application-to-person traffic.

**The relay:** voip.ms only accepts API calls from whitelisted IPs, and Vercel's outbound IPs aren't fixed. Sending therefore goes through an n8n workflow on a server with a fixed IP; setup is in `relay/README.md`. Receiving isn't affected. More in [voipms.md](voipms.md).

## Sending a text by hand

```bash
curl -X POST https://<your-site>/api/sms-send \
  -H "Authorization: Bearer $SMS_SEND_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to":"5551234567","message":"Hello"}'
```

Text that fits one SMS goes out through `sendSMS`: 160 characters, or 70 if any character needs Unicode (accents outside the GSM alphabet, curly quotes, non-Latin scripts). Longer text (up to 2048 characters) or messages with `media` (up to 3 URLs) go out through `sendMMS`.

## Local testing

`node dev/server.mjs` serves the site on http://localhost:8787 with every API handler running against an in-memory database (`dev/fake-db.mjs`), a fake voip.ms and a fake Google Translate. Nothing leaves the machine. Log in to `/admin` with the setup password `pw` and add a user. A few conversations are seeded through the real SMS handler, and **Add simulations** adds eleven more.
