# The first 30 days (`/journey`, `/j/<key>`)

`public/journey.html` at `/journey` and `/j/<key>` (rewrites and noindex headers in `vercel.json`); `lib/journeys.js`, `api/journey.js`, `api/admin/journeys.js`. The plan behind it is [../plan-discipleship.md](../plan-discipleship.md).

## History and decisions

- Migration `20261024170000`: tables `btw_journeys`, `btw_checkins`, `btw_journey_days`, column `btw_churches.weekly_note`, Bible links as `btw_guides` key `bible_url`, prompts `j_*`, `web_*journey*`, `web_weekly_note*`, `land_journey_button` hand-translated into all 10 languages.
- Brought closer to the hackathon brief (FaithTechGlobalLabs/faithtech-socal-hackathon, `tracks/3-first-30-days`) on 2026-10-24: gone quiet, QR code, sample people, +1 day.
- Decided with the user: **online only, except one text.** The phone is required (it's how they get in: migration `20261025140000`) and is texted their `/j/<key>` link when they start. The same number entered again on the form texts that same link again (`j_link_resent`; the key is never shown to whoever typed the number). No reminders are texted (decided 2026-10-25).
- The link text: originally only for those who gave a phone (`j_link_text`, migration `20261025130000`, which also reworded `j_phone_hint` from "Optional"); kind `journey_link` in `btw_web_requests`, 1 per number per 10 minutes, the daily cap; not for a simulated church.
- **My church may contact me** (`contact_ok`: the church sees the number; reworded `j_contact`) and **may see my progress** (`j_consent`, `consent_at`; without it they're left off the church's tab and /admin's list, which only counts them as private) are optional (2026-10-25).
- The drafted plan (Navigators-style first lessons, Mark, Acts 2 and belonging, living it out) ships as a draft editable in `/admin`. One day opens per calendar day, Read it links out, anyone can start.

## Start (`/journey`)

- Language, church search (as testimonies), first name.
- **Are you 18 or older?** is hidden since 2026-10-25 by the user's choice, as on the story form: `ASK_AGE = false` in `journey.html`, so an unanswered age counts as 18+ and My church may contact me and the phone are offered to everyone; an answer carried from their story still counts. When asked: `story_age*`, required; `btw_journeys.adult`; under 18, "My church may contact me" and the phone aren't offered and the server takes no phone, so churches never get a minor's number; the church tab shows `web_journey_minor`, /admin "Under 18".
- **My church may contact me** (+ phone), consent.
- Or **from a saved story** (`/journey?story=<key>`, button on `/s/<key>`), which carries church, name and the verified phone and returns the same journey if started again.
- Or **from the church's QR code** (`/journey?church=<id>&lang=`, the church picked and changeable; a simulated church only this way, `via_qr`, for demos).
- Bots get a dead link; 10 starts per visitor per hour (`journey` in `btw_web_requests`).

## The days (`/j/<key>`)

- Day N opens on the Nth calendar day from `started_on` in the browser's time zone (`tz`); missed days stay open.
- 30 dots, today expanded. Each day: passage with **Read it** (the language's `bible_url` with the English reference, Bible Gateway by default), note, question, step, **Done**.
- Day 27 links to the story form.
- Check-ins on days 7, 14, 21, 30 (Going well / It's hard / I have a question + note; day 30 also the next step).
- **Add a daily reminder to my calendar** downloads an `.ics` (daily, floating local time, for the days left).
- The church's weekly note shows on top.

## Church page: Newly baptized tab

- A QR code card ("Invite them with a QR code"; **Print** gives a sheet with the church's name, "Your first 30 days", the code and the link; drawn in the browser by `public/js/qrcode.js`, Kazuhiko Arase's MIT qrcode-generator 1.4.4, loaded only on this tab; prompts `web_journey_qr*`, `web_print`, migration `20261024190000`).
- Everyone from that church with day, done count, **Last active** (`web_journey_last`, "3 days ago" written by the browser), check-ins and notes, phone if they allowed contact.
- **Could use a call** (`flagOf` in `lib/journeys.js`, since `talked_at`): an It's hard / question answer; gone quiet, 3 days without opening their page or checking in, until the 30 days are done; or a check-in missed by 3 days. With **We talked**.
- The weekly note (`PATCH /api/profile` `{ weekly_note }`).

## /admin Discipleship screen

- Totals (started, opened this week, finished, could use a call; count on the tab), answers per check-in day, everyone's progress with why they could use a call and when they were last active.
- **+1 day** (demo: `POST ?part=skip&id=` starts them a day earlier; their activity is left alone).
- **The 30 days** editor (day × language; **Translate into every language** makes Google drafts of all 30 days, which need checking).
- **Read it links** per language.

## Sample people

Add simulations (Conversations) also adds six newly baptized people from the brief's test data (`btw_journeys.simulated`; Carla and Mateus started today, Jordan under 18 with no phone, Rosa and Mika gone quiet, Paulo said it's hard on day 7) at the first finished simulated church. Remove simulations removes them. **Add sample people** on Discipleship (`POST /api/admin/journeys?part=samples`) replaces just them, leaving the simulated churches alone.
