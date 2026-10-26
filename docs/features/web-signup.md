# Web signup (`/signup`) and spam protection

## The form

`public/profile.html` is served at `/signup` (rewrite in `vercel.json`). Without a key, the pastor's page (see [pastor-page.md](pastor-page.md)) becomes a signup form: phone editable, language picker, `?lang=` from the front page, consent box.

- `POST /api/profile` saves a finished signup (`completed_at`, `consent_at`, `profile_key`) and a `done` session, so later texts from that phone are handled as finished, then opens `/p/<key>?welcome=1`.
- Refused (409) when the phone already has a signup (one church per phone).
- Prompts `web_signup_*` etc. (migration `20261024110000`).
- On the web pages Country comes right after the church's name; when it isn't the US, the State and ZIP labels become `web_region` ("State / province / region") and `web_postal` ("Postal code") (migration `20261024140000`). Checking is shared with /admin through `lib/church-fields.js`.

## Spam protection

`lib/web-guard.js`, migration `20261024130000`: tables `btw_web_requests`, `btw_web_codes`, prompts `web_code_*`, `web_wait`, `web_busy`.

- **Code first.** The first Sign up checks the answers and texts a 6-digit code (`web_code_text`), answering 202 `{ needCode }`. The form then asks for the code and sends everything again with `{ code }`. Only then is the signup saved, and it is texted the thank-you `done` + `done_link`, like a signup by text. `{ resend: true }` sends a new code.
- **Codes:** stored as a salted hash, valid 10 minutes, 5 tries.
- **Numbers:** US/Canada only, since those are the only ones our number can text.
- **Bots** (the hidden box filled in, or `elapsed` under 3 s) get the normal answer, and nothing is sent or saved. The box is labeled "Leave this box empty" with id/name `hpx` (sent as `company_hp`, or `hpx` from the signup form). Until 2026-10-24 it was labeled "Company", and browser autofill filled it from the person's contact card, so a real person starting the 30 days got a dead link ("This link doesn't work anymore").
- **Limits** (`btw_web_requests`, IP stored as a salted hash):
  - codes: 1 per number per minute, 3 per hour; 10 per visitor per hour, 30 per day;
  - Get my link: 1 per number per 10 minutes; 5 per visitor per hour, 20 per day.
  - Testimony and 30-days links have their own kinds; see [testimonies.md](testimonies.md) and [first-30-days.md](first-30-days.md).
- **Daily cap** `WEB_TEXTS_PER_DAY` (default 300) on codes, links and thank-yous. Past it, sending stops and a `web-cap` error is logged once a day.
- `btw_web_requests.kind` has a check constraint listing every kind `record()` uses. A new kind needs it updated (migration `20261025150000`), or the insert fails with a 500. `dev/fake-db.mjs` doesn't enforce constraints, so tests won't catch it.
