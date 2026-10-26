# /admin ("SMS Gateway")

`public/admin.html`: vanilla JS module, no build step. `api/admin/*` needs a logged-in user (`await requireAdmin(req, res)` returns the user or answers 401).

## Screens

A tab bar switches screens by `data-screen` on each section, kept in the URL hash:

| Hash | Screen | Details |
|---|---|---|
| `#conversations` (default) | Every signup and its texts; unread count on the tab | [team-messages.md](team-messages.md) |
| `#churches` | Every signup with `completed_at`, newest first, with contact details, address, search, and Edit / Conversations / Message buttons; built from the same `GET /api/admin/conversations` list | below |
| `#photos` | Every church's photos | [photos.md](photos.md) |
| `#baptisms` | Counts and grand total | [baptism-counts.md](baptism-counts.md) |
| `#testimonies` | Stories shared with the team | [testimonies.md](testimonies.md) |
| `#discipleship` | The first 30 days | [first-30-days.md](first-30-days.md) |

The setup screens sit in a **Settings ▾** menu at the end of the bar (the tab reads "Settings · <screen>" while one is open): `#prompts`, `#languages` (on/off, menu labels, first-message preview) (both: [prompts-and-languages.md](prompts-and-languages.md)), `#log`, `#users`, `#connection` (voip.ms checks and test text; [../voipms.md](../voipms.md)). The setup login sees only Users, with no tab bar.

## Users

Migration `20261023190000`, `api/admin/users.js`, `lib/admin-auth.js`.

- One login per person (email + password, min 8), all with equal rights: add, rename, set a new password, remove (soft: `active = false`, so their messages keep their name; you can't remove yourself).
- Users live in `btw_users` with scrypt passwords. The cookie is HMAC `id.session_version.exp.sig` keyed by `ADMIN_PASSWORD`, checked against the database on every request.
- A password change or removal bumps `session_version`, signing that person out everywhere (your own change re-issues your cookie).
- While no user exists, `ADMIN_PASSWORD` logs in as "Setup", which can only add users (other endpoints answer 403). Once one exists it no longer logs in, but it still signs the cookies, so changing it signs everyone out.
- Text alerts are set up here (see [team-messages.md](team-messages.md#text-alerts)).

## Editing answers

Migration `20261023200000`: `btw_churches.edited_by`, `edited_at`; `api/admin/churches.js` GET/PATCH `?phone=`.

- Edit on the Churches screen or Edit answers in a conversation opens a form over every `btw_churches` answer, checked like the SMS signup (email, US state by name or code, 5-digit ZIP, 10-digit phone, website; outside the US, any region and postal code; `lib/church-fields.js`). /admin says "State / region" and "ZIP / postal code" throughout.
- Only the saved answers change; `btw_messages` is never touched.
- "Edited <date> by <name>" shows on the Churches row and in the answers panel ("by the pastor" for page edits).
- A pastor's later `EDIT <n>` by text starts from the edited values.

## Simulations

Migration `20261023210000`: `btw_churches.simulated`; `lib/simulations.js`, `api/admin/simulations.js` POST add / DELETE remove; panel at the bottom of Conversations.

- Eleven scripted pastors run through the real engine with the live prompts (bot replies are exactly what a pastor would get), then reviewer/pastor follow-ups in the Messages thread and the answer edits they led to; finished ones get a random baptism count (5 to 50).
- Covers English/Spanish/Chinese, a church in Canada, detection and the menu, input mistakes, EDIT, MENU switching, STOP, an abandoned signup and an unread question.
- Fictional 555-01xx numbers, "Simulation" badge everywhere; a message sent to a simulated number is saved but never texted.
- Adding replaces earlier simulations; scenarios in a language that's switched off are skipped. Reviewer messages and edits are credited to whoever pressed Add.
- Add simulations also adds sample stories ([testimonies.md](testimonies.md)) and six sample people ([first-30-days.md](first-30-days.md)); Remove simulations removes them too.
- They are loaded in the live database (added from the live site on 2026-10-23; 11 since the Canadian church was added).

## Log panel

`api/admin/events.js`. The latest 200 `btw_events` rows (errors, warnings and info from `sms-inbound`, `sms-send` and the rest; written by `logEvent()` in `lib/events.js`, which never throws), with a link from a phone number to its conversation. Checked in a browser against an in-memory database, not yet against production.
