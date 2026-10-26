# btw: project notes

Goal: Baptize 2027 church signup, entirely by SMS through voip.ms, on Vercel serverless functions with Supabase. Churches pick a language and answer ~14 questions one text at a time; the last answer finishes the signup, and the reply thanks them with a link to their own page where they can see and change every answer. The newly baptized can share their story and follow a first 30 days. Reviewers work in `/admin` ("SMS Gateway"): see signups, text pastors, edit answers. Setup and usage are in `README.md`; the 2026-10-23 build session (what was built, the decisions behind it, what's left, tooling quirks) is in `docs/session-2026-10-23.md`.

Live site: https://baptize.app (Vercel project `btw`; also https://btw-dusky.vercel.app, which voip.ms's callback uses). Database: Supabase project `supabase-cobalt-saddle` (ref `jrkhnieyramucpegntln`), which is **shared with other apps**: everything of ours is prefixed `btw_`, and nothing else in it should be touched.

## Where the details are

Each feature's spec (what it does, its rules, the migrations and prompts behind it, the user's decisions about it) is in `docs/features/`. **When you change a feature, update its doc in the same change**, and `public/features.html` ("How it works") when users would notice.

| Doc | Covers |
|---|---|
| `docs/features/sms-signup.md` | The engine, `sms-inbound` (language detection, MENU, STOP, RESTART), the questions and country, finishing without a summary, the web form link during a text signup ("last entry counts"), sending |
| `docs/features/web-signup.md` | `/signup`, texted codes, bot checks, rate limits, daily cap |
| `docs/features/pastor-page.md` | `/p/<key>`: the link (only login), tabs, Your messages, Resources, Send login link |
| `docs/features/photos.md` | Photos on the page, the church's one permission choice, MMS in, `photo_ask` |
| `docs/features/baptism-counts.md` | Counts by text (`readCount`, big-jump check), on the page, /admin Baptisms screen |
| `docs/features/team-messages.md` | Conversations panel, team thread, Finish signup, unread, text alerts |
| `docs/features/admin.md` | /admin screens, users and login, editing answers, simulations, Log |
| `docs/features/prompts-and-languages.md` | Prompts as data, the editor and Translate, the 160 cap, languages, keywords |
| `docs/features/testimonies.md` | `/story`, `/s/<key>`, sharing choice, parent's OK (`/g/<key>`), story picture, Stories tab, /admin Testimonies |
| `docs/features/first-30-days.md` | `/journey`, `/j/<key>`, check-ins, Newly baptized tab, /admin Discipleship, sample people |
| `docs/features/front-page.md` | `/` (three ways in, Get my link) and `/features` (translated "How it works") |
| `docs/voipms.md` | The n8n relay and IP whitelist, Connection screen, open API questions, 10DLC, research sources |
| `docs/schema.md`, `supabase/schema.sql` | The database: diagram, tables, how they link; current-state DDL (reference, not a migration) |
| `docs/workflows.md` | Mermaid diagrams of the three journeys: churches, the baptized sharing a story, the first 30 days |
| `docs/gaps.md` | Known gaps, kept on purpose for the demo |
| `docs/plan-testimonies.md`, `docs/plan-discipleship.md` | The plans behind testimonies and the 30 days |

## Layout
- `public/`: the only folder Vercel publishes (`vercel.json` sets `outputDirectory`). Before that, the whole repo, `docs/` and `CLAUDE.md` included, was publicly downloadable. `cleanUrls` serves `admin.html` at `/admin` (and `story.html` at `/story`, `journey.html` at `/journey`); rewrites in `vercel.json` serve `profile.html` at `/signup` and `/p/<key>`, `story.html` at `/s/<key>` and `/g/<key>`, and `journey.html` at `/j/<key>` (all four keyed paths noindex).
  - `index.html` (`/`), `features.html` (`/features`), `profile.html`, `story.html`, `journey.html`, `demo.html` (`/demo`, the engine on live prompts), `admin.html` (vanilla JS module, no build step).
  - `js/engine.js`: the conversation as a pure function, `reply(state, text) -> { state, replies }`, shared by the demo and the SMS handler. `js/sms.js`: GSM-7 / Unicode segment counting. `js/qrcode.js`: qrcode-generator 1.4.4 (MIT).
- `api/`: serverless functions. `api/admin/*` needs a logged-in user (`await requireAdmin(req, res)` returns the user or answers 401).
- `lib/`: server helpers. `voipms.js` (voip.ms API calls and `sendText`, direct or via the relay; `canText`), `supabase.js` (PostgREST over fetch; `dbAll()`), `events.js` (`logEvent()` into `btw_events` for the Log panel; never throws), `admin-auth.js`, `prompts.js`, `translate.js` (Google v2 behind `translate()`, `detect()`, `translateHtml()`), `web-guard.js`, `church-fields.js`, `profile-link.js`, `photos.js`, `storage.js`, `counts.js`, `team-alerts.js`, `simulations.js`, `stories.js`, `journeys.js`, `baptize.js` (mocked hand-off to baptize.org), `web-text.js`.
- `supabase/migrations/`: schema and seed, already applied to the shared project.
- `dev/`: local testing, not deployed. `node dev/server.mjs` serves `public/` and every API handler on http://localhost:8787 against `dev/fake-db.mjs` (in-memory Supabase, fake voip.ms and Google Translate); setup password `pw`.
- `relay/`: the n8n relay that sends through voip.ms from a whitelisted IP.
- No package.json and no dependencies; everything relies on Node's built-in `fetch`.

## Decisions (the user's; details in docs/session-2026-10-23.md and the feature docs)
- Any text starts or continues a signup; no keyword.
- No numbered summary to confirm: the last answer finishes the signup, and changes are made on the pastor's page (link in the thank-you). Churches outside the US are accepted (country question; free-form region and postal code).
- One church per phone number. Multi-church was proposed and declined. RESTART after a finished signup no longer wipes it (2026-10-25).
- The last entry counts, by web or by text.
- Every prompt at most 160 characters. Long translations are fixed by shortening the English and translating again.
- All 14 signup questions stay by text; on 2026-10-25 the 12 longest prompts were shortened by hand in all 10 languages (migration `20261025120000`). Moving questions to the church's page was offered and declined.
- Reviewers share the signup number. A finished signup's free text goes to the team thread; there's no open/close chat switch. Alerts: unread badges, plus opt-in text alerts per team member (2026-10-25).
- All users have equal rights. Editing answers never changes the texts.
- Simulations live in the real database, flagged and badged, and are never texted.
- Testimonies: first name only, no AI helper, nothing published by us; the writer chooses who reads it. The age question is hidden for now (2026-10-25), on both the story and the 30-days forms.
- The first 30 days are online only, except the one text with their link; no reminders are texted.
- Removing a photo or a story deletes it for good.
- The public map exists elsewhere; this app only stores `public_map`.
- Workflow: work on `claude/intelligent-brown-8znoxb` reset onto `main`, then a PR, merged only when the user says so. Migrations are applied through the Supabase MCP and also saved under `supabase/migrations/`.

## Tooling quirks
- Supabase returns at most 1000 rows per request. `btw_prompts` (one row per prompt per language) passed that with the country change (1053 rows) and was 1203 on 2026-10-24, so the newest prompts silently went missing (a texted photo's permission question went out empty: voip.ms `message_empty`). Whole-table reads use `dbAll()` in `lib/supabase.js` (pages with `limit`/`offset`; give it an `order`), and an empty reply is logged instead of sent.
- `btw_web_requests.kind` has a check constraint listing every kind `record()` uses; a new kind needs it updated (migration `20261025150000`), or the insert fails with a 500. `dev/fake-db.mjs` doesn't enforce constraints, so tests won't catch it: the 30-days resend and the parent link text both broke live this way on 2026-10-25.
- Supabase MCP: reads and `apply_migration` work; DELETE via `execute_sql` times out (use `/admin`'s Delete button).
- Vercel MCP: deployments and runtime logs work (project `prj_0mYe7r3u736ewePhPOnodWuQQSQ7`, team `team_lgFLmF4DFBT7H0DS0A1KcLNr`); listing env vars is forbidden.
- The live site isn't reachable from the sandbox; test with `dev/server.mjs` and Playwright (`/opt/pw-browsers/chromium`).
- After a migration, refresh `supabase/schema.sql` and `docs/schema.md` from the live database (information_schema / pg_constraint reads through the Supabase MCP).

## Next steps
- Native-speaker check of the hand-written keyword lists and fixed prompts (migration `20261024020000`), and of `lang_detected` / `kw_menu`.
- Confirm in production: the Log panel, a reviewer/pastor message round trip, language detection with a real non-English first text.
- Decide whether to remove the simulations before real signups start (Conversations → Remove simulations).
- Optional, offered and not chosen yet: email alerts (needs an email provider); a data-retention rule.
- voip.ms: simplify the callback parsing, the open API questions, 10DLC registration (`docs/voipms.md`).
