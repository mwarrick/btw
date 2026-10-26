# Signup by text

Churches pick a language and answer about 14 questions one text at a time; the last answer finishes the signup, and the reply thanks them with a link to their own page (see [pastor-page.md](pastor-page.md)). Any text to the number starts or continues that number's signup (no keyword).

## The engine (`public/js/engine.js`)

- The conversation as a pure function, `reply(state, text) -> { state, replies }`, shared by the browser demo (`/demo`) and the SMS handler.
- State is JSON for `btw_sessions`; `data` uses `btw_churches` column names. Answers live only in `btw_churches`; the session row holds phase, lang, queue, editing.
- The first message is `menu_intro`, then `<n> <menu_label>` per switched-on language, then `menu_footer`.
- After an opt-out (STOP and the other carrier words) it sends nothing until START.
- `public/js/sms.js`: GSM-7 / Unicode segment counting, imported by the pages and by the API.
- `/demo` (`public/demo.html`) runs the engine on the live prompts from `GET /api/prompts`, so edits at `/admin` show there (that endpoint is cached 15s at Vercel's edge). Nothing is saved or sent.

## Receiving (`api/sms-inbound.js`)

The voip.ms SMS URL callback (format and setup: [../voipms.md](../voipms.md)).

- Checks `?key=SMS_INBOUND_KEY`, accepts GET (with `&` or `;` between values) or POST JSON, and normalizes the message to `{id, from, to, message, date, media}`.
- Texts from short codes and other non-10-digit senders (e.g. WhatsApp's 29283) are never answered but show in the Log panel (`info`, source `short-code`, with the text).
- Records the text in `btw_messages` (a repeated voip.ms `id` is a retry and is ignored), loads `btw_sessions` + `btw_churches` for the phone (`+1XXXXXXXXXX`), runs `engine.reply`, saves both rows, then sends the replies through `sendText`.
- `status` is `complete` from the first DONE until a restart, `opted_out` after STOP.
- A failed send is logged and not retried, since the state is already saved. Failures go to `btw_events` (Log panel), and a reply that wasn't sent is kept in `btw_messages` with its `error`.
- An empty reply is logged instead of sent (see the 1000-row quirk in `CLAUDE.md`).
- A text from a number that only has a testimony, or from a team member's alert phone, with no signup isn't answered (see [testimonies.md](testimonies.md), [team-messages.md](team-messages.md)).
- Receiving confirmed live on 2026-10-23; the first reply failed (`sms_toolong`, fixed since).

## Language

- A new number's first text goes to Google's language detection (`detect()` in `lib/translate.js`). When it has 4+ letters, confidence is 0.8+ and the language is switched on, the signup starts in that language (`engine.startIn`: `lang_detected`, `welcome`, first question). Otherwise, or if detection fails (logged as a warning), it gets the menu.
- STOP as a first text still opts out.
- MENU (`kw_menu`, built in) brings the menu back at any point; picking a language then keeps the answers and resumes where they were.

## Questions, country, and no summary

Migration `20261024000000`.

- After the church's name the engine asks `ask_country` ("Is your church in the US? Reply YES, or send your country."). YES or a typed US name (USA, U.S., Estados Unidos, 美国, ...; `countryValue()` in `engine.js`) stores `country = 'US'`; anything else is kept as typed (lowercase Latin capitalized).
- Outside the US, the state and ZIP questions (church and baptism site, which shares the church's country) become `ask_region` / `ask_postal`: any region, and a postal code of letters, digits, spaces and dashes up to 10 (`err_postal`), both SKIPpable. `lib/church-fields.js` checks the same way for `/admin` and the pastor's page.
- Rows from before have `country` 'US' (backfilled where a state was given) or null, which counts as US.
- The numbered summary is no longer sent: the last answer (consent) sets phase `done` (so `completed_at`) and replies `done` + `done_link`.
- `EDIT <n>` by text still works with the old numbers (country is 13) and ends with `edit_saved` + the link; DONE re-sends the link.
- `done`, `done_reply` and `help` were reworded in all 10 languages to drop EDIT/summary.
- On 2026-10-25 the 12 longest prompts were shortened by hand in all 10 languages (migration `20261025120000`; `ask_consent` now starts "Last one:").
- RESTART after finishing no longer erases the signup: the engine (`extra.locked`) replies `restart_locked` with their page link. EDIT/STOP/HELP/MENU/RESTART still go to the bot.
- After the signup is finished, free text goes to the team (see [team-messages.md](team-messages.md)), a number is a baptism count (see [baptism-counts.md](baptism-counts.md)), and pictures are handled as in [photos.md](photos.md).

## Web form during a text signup

Migration `20261024160000`.

- Right after the language is picked the first time (detected, or chosen from the menu; not again after MENU), `sms-inbound` texts `web_form_link` ("Or fill in one form instead: {link}") between the welcome and the first question, and saves the church's `profile_key` then, so `/p/<key>` works from the start.
- For an unfinished signup the page has no tabs, says `web_finish_intro`, shows the answers texted so far plus the consent box, and its button is `web_finish_button`.
- Saving needs every answer the signup form needs, plus consent; it then completes the church, sets the session to `done` (the text questions stop; later texts are handled as finished) and texts the usual `done` + `done_link` thank-you (not for simulations or after STOP). The page then reloads as the full page with the thank-you banner.
- The final link at the end of a text signup is unchanged.
- **The last entry counts, by web or by text** (the user's rule):
  - the page sends only the answers changed on it, so an answer texted after the page opened isn't overwritten by the page's stale copy;
  - while unfinished, each changed answer is saved as it's entered (`PATCH` `{ partial: true, ... }`, no consent needed), so nothing is lost if the connection drops and they carry on by text;
  - `sms-inbound` drops questions already answered on the page from the rest of the queue (`answeredOnPage`), keeping the one on their phone, whose reply overwrites the page's answer.
- The saved country still decides how a changed state or ZIP is checked.

## Sending (`api/sms-send.js`, `lib/voipms.js`)

- `api/sms-send.js` sends a text: POST with a Bearer `SMS_SEND_KEY`.
- `sendText` uses `sendSMS` when the text fits one SMS segment (160 GSM-7 characters, but only 70 once any character needs Unicode, e.g. a language name in its own script), and `sendMMS` for anything longer (up to 2048) or media (up to 3 URLs). The first live reply failed with `sms_toolong` because the menu (all 10 languages on, native-script labels) was 136 Unicode characters sent as SMS.
- Sending goes through the n8n relay; see [../voipms.md](../voipms.md).
