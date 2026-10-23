# btw

Church signup for Baptize 2027, entirely by text message through [voip.ms](https://voip.ms), on Vercel serverless functions with a Supabase database. The SMS wording lives in the database and is edited at `/admin`.

| Path | Purpose |
| --- | --- |
| `/` | A browser demo of the signup conversation. Nothing is saved or sent. |
| `/admin` | Prompt editor: edit every message in every language, switch languages on and off. Needs `ADMIN_PASSWORD`. |
| `POST /api/sms-send` | Send an SMS or MMS from your voip.ms number |
| `GET/POST /api/sms-inbound` | voip.ms calls this when a text arrives |
| `/api/admin/*` | The editor's API: `session`, `prompts`, `languages`, `translate` |

Only `public/` is published as the website (see `vercel.json`). Everything else in the repo, including `docs/`, stays private.

## Environment variables

| Name | What it is |
| --- | --- |
| `VOIPMS_API_USERNAME` | Your voip.ms account email |
| `VOIPMS_API_PASSWORD` | The API password, which is separate from your portal password |
| `VOIPMS_DID` | Your voip.ms number to send from, as 10 digits |
| `SMS_SEND_KEY` | Shared secret that callers of `/api/sms-send` must send |
| `SMS_INBOUND_KEY` | Shared secret in the voip.ms callback URL |
| `VOIPMS_API_URL` | Optional: the address of a fixed-IP relay (see below) |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | The service role (secret) key. Server-side only. |
| `ADMIN_PASSWORD` | Password for `/admin`. Changing it logs everyone out. |
| `GOOGLE_TRANSLATE_API_KEY` | API key restricted to the Cloud Translation API, for "Draft with Google" in the editor |
| `TRANSLATE_PROVIDER` | Optional: `google` (the default and only option so far) |

## Database

The schema and seed are in `supabase/migrations/`. Every table is prefixed `btw_` because the Supabase project is shared with other apps. Row level security is on with no policies, so only the service role key reaches the data.

| Table | Holds |
| --- | --- |
| `btw_languages` | Languages in the SMS menu, with an on/off switch and a GSM-safe menu label |
| `btw_prompt_keys` | One row per message, with a description and the `{placeholders}` it must keep |
| `btw_prompts` | The text of each message in each language |
| `btw_churches` | One signup per phone number |
| `btw_sessions` | Where each phone number is in the conversation |
| `btw_messages` | Every text in and out; the voip.ms id is unique so retries are handled once |

A language can only be switched on once every message has text in it. Google drafts are never saved until someone reviews them and clicks Save.

## voip.ms setup

1. In the voip.ms portal, go to the API settings. Set an API password, turn API access on, and whitelist the IPs that will call the API.
2. Edit your DID and turn on SMS (and MMS if you want it). Set the **SMS URL Callback** to:

   ```
   https://<your-site>/api/sms-inbound?key=<SMS_INBOUND_KEY>&to={TO}&from={FROM}&message={MESSAGE}&id={ID}&date={TIMESTAMP}
   ```

   Turn on **URL callback retry** too. voip.ms keeps retrying until the endpoint replies `ok`.
3. US numbers: register a brand and a campaign for 10DLC in the portal. Carriers filter unregistered application-to-person traffic.

## Sending

```bash
curl -X POST https://<your-site>/api/sms-send \
  -H "Authorization: Bearer $SMS_SEND_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to":"5551234567","message":"Hello"}'
```

Text of 160 characters or less goes out through `sendSMS`. Longer text (up to 2048 characters) or messages with `media` (up to 3 URLs) go out through `sendMMS`.

## Caveats

- **IP whitelist and Vercel:** voip.ms only accepts API calls from whitelisted IPs, and Vercel's outbound IPs aren't fixed. To send from Vercel, set `VOIPMS_API_URL` to a relay with a static IP, or use Vercel's static IP option. Receiving isn't affected.
- **Incoming request format isn't confirmed:** sources disagree on whether voip.ms sends GET with placeholders (sometimes separated by `;`) or POST with JSON. `sms-inbound` accepts both. Log one real message to confirm.
- These notes come from voip.ms wiki pages and third-party integrations. Check them against the official API docs at <https://voip.ms/m/apidocs.php>, which you can read when logged in to the portal.
