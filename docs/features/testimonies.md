# Baptism testimonies (`/story`, `/s/<key>`, `/g/<key>`)

`public/story.html` at `/story`, `/s/<key>` and `/g/<key>` (rewrites and noindex headers in `vercel.json`); `api/story.js`, `api/admin/testimonies.js`, `lib/stories.js`. The earlier plan is [../plan-testimonies.md](../plan-testimonies.md).

## History and decisions

- Migration `20261024150000`: tables `btw_testimonies`, `btw_guides`; prompts `story_*`, `web_tab_stories`, `web_stories_intro`, `web_no_stories`, `land_baptized_button` hand-translated into all 10 languages.
- Decided with the user: every finished non-simulated signup is in the church list, first name only, no AI helper, nothing published by us.
- Reshaped on 2026-10-24 to the hackathon brief (FaithTechGlobalLabs/faithtech-socal-hackathon, `tracks/2-testimony-sharing`; migration `20261024180000`: columns `answers`, `share`, `adult`, `guardian_name`, `guardian_at`, `featured_at`; prompts `story_q_*`, `story_share*`, `story_age*`, `story_guardian*`, `story_card*`, `story_copy*`; `story_intro`, `story_consent`, `web_stories_intro` reworded): **the writer chooses who reads it.**

## Start (`/story`)

In order on the page:

1. The advice first (closed until opened, above the form, so it's there before asking for a link; `GET ?part=start` returns it).
2. **See example stories** (closed until opened; the same `story_examples` text as on `/s/<key>`, also in `GET ?part=start`).
3. Language.
4. Church search (`GET ?part=churches&q=`, name or city, 2+ letters; only name and place are exposed, by `btw_churches.id`).
5. Phone from any country (`anyPhoneValue` in `lib/web-text.js`: + and country code, or a US/Canadian number without; migration `20261024200000`, prompts `story_phone_invalid`, `story_cant_text`, `story_phone_hint` reworded). Whether it can be texted is `canText` in `lib/voipms.js`, today US and Canada only, so switching provider changes only that file.
6. **Text me a link** (`POST ?part=link`, limited like Get my link: kind `story` in `btw_web_requests`, same bot checks and daily cap).

- One testimony per phone; asking again re-sends the same `/s/<key>` (the texted link proves the phone).
- The hint and the texted link say the link is for writing, checking on, changing or deleting the story (`story_phone_hint`, `story_link_text` reworded).
- The first save texts the link once more (`story_saved_text`, `saved_texted_at`, kind `story_saved`, the daily cap; not for sample stories; migration `20261025160000`).

## Write (`/s/<key>`)

- Under the church's name, the phone their link was texted to, read-only (`web_phone`).
- The advice again, folded (`btw_guides` key `testimony`, in their language, English where missing; `## ` headings, `• ` bullets, `**bold**`, blank-line paragraphs, rendered as text never HTML).
- First name (`story_name_label`, "Your first name, or the name you'd like on your story").
- **See example stories** (closed until opened, its own card just below the advice, as on `/story`): three made-up stories, Daniel, Ana and Josh, each showing its answers to the form's questions and the story they became; `btw_guides` key `story_examples`, same markup and English fallback as the advice, edited and translated on /admin's Testimonies screen under Text: Example stories; prompt `story_examples`, migration `20261024230000`, English only until translated.
- Five guided questions (life before, why, the moment, a word to someone thinking about it, a verse, optional; `answers`) whose answers fill the story box until they edit it by hand (4000 characters max, word count shown against the advice's 250).
- The 🎤 Speak buttons were removed on 2026-10-25: speech to text didn't work; the prompts `story_speak`, `story_listening` are unused.
- **Who can read your story?**: Only me / My church / My church and the Baptize 2027 team, who may feature it (`share` `me`/`church`/`baptize`). Anyone else reading it needs the consent box. `consent_text` keeps the choice and `story_consent` word for word.
- **Are you 18 or older?** is hidden since 2026-10-25 by the user's choice, pending a later decision: `ASK_AGE = false` in `story.html`, so a new shared story is saved as 18+ and no parent is asked. A story saved earlier as under 18 keeps that answer and its parent step. The code, prompts and data below are kept.
- Save marks it New for the team again; **Delete my story** removes it for good.
- Once saved, a status line under the church's name says who can read it (`story_status_me` / `_church` / `_baptize`) and, when shared with the team, "Read by the team" (marked read since their last change) and "★ Featured by the team" (`story_status_read`, `story_status_featured`; migration `20261024220000`).
- A button on `/s/<key>` starts the first 30 days from the story (see [first-30-days.md](first-30-days.md)).

## Under 18: a parent's OK

Migration `20261025100000`: columns `guardian_key`, `guardian_declined_at`, `featured_texted_at`; prompts `story_guardian_*`, `g_*`, `story_featured`. (Only reached for stories saved as under 18; the age question is hidden today.)

- The story stays private until a parent or guardian approves it on their own link, `/g/<guardian_key>` (rewrite and noindex in `vercel.json`; the same `story.html`).
- After saving, the writer's page shows **Send the link** (share menu, else copy) and **Text it to them** (`POST ?key=&part=guardian-text`, US/Canada, kind `guardian` in `btw_web_requests`, 1 per number per 10 minutes, the daily cap; not texted for sample stories).
- The parent's page shows the story, its church and who would read it, their name, `g_agree` and **I approve** / **Not yet** (`GET`/`POST /api/story?g=`; sets `guardian_at` + `guardian_name` and adds `g_agree` with the name to `consent_text`, or `guardian_declined_at`).
- A save that changes the name, answers, story, sharing or age asks again (same link); an unchanged save keeps the approval.
- Until approved, `readable()` in `lib/stories.js` keeps it off the church's Stories tab, /admin (counted as waiting for a parent's OK) and featuring. The writer's status line says waiting / approved by <name> / not yet.
- Older stories approved by the earlier tickbox keep `guardian_at` and count as approved. Stories saved before this count as `baptize` (that's what they agreed to then).

## Post it yourself

Once saved, a 1080×1920 picture (WhatsApp/Instagram Status size) drawn in the browser:

- logo, a quote (the line they tap under the picture, `story_card_pick`, from the story's sentences; else the moment answer, the advice, why, or the story's start; shrinks to fit, cut with …), "— first name", `story_card_church`, the verse, "Baptize 2027" and #BaptizeTheWorld (also at the end of the shared and copied text).
- **Share my story** opens the phone's share menu with the picture and text (downloads where that isn't supported), **Save the picture**, **Copy the text**. Nothing is sent to us.

## Church page: Stories tab

- `GET /api/profile?key=&part=stories` lists the stories shared with it (`share` `church` or `baptize`), read-only.
- Above them, a QR code card "Invite them to share their story" (`web_story_qr*`, migration `20261024210000`; the same card as the 30 days', with Print) that opens `/story?church=<id>&lang=` with the church picked (a simulated church only this way, `via_qr`).

## /admin Testimonies screen

- The stories shared with the team (`share = 'baptize'`); the rest are only counted (kept private, for their church only).
- Each shows church (opens its conversation), language, phone, "Under 18 · OK from <guardian>", **New** until **Mark read** (count on the tab).
- **☆ Feature** (`featured_at`; All / Featured tabs):
  - the first time a story is featured its writer is texted `story_featured` with their `/s/<key>` link, once ever (`featured_texted_at`), not for sample stories or numbers we can't text;
  - featuring also calls `saveStory()` in `lib/baptize.js`, the hand-off to baptize.org, mocked since Baptize has no API: it logs an `info` event from `baptize` with the story as Baptize would take it;
  - refused for a story not shared with the team, and cleared when the writer stops sharing with the team.
- **English translation** (Google, not saved, labeled "Machine translation (Google), may be wrong") and Delete.
- **Add sample stories** (`POST ?part=samples`) replaces the three made-up stories from the brief's test data (`btw_testimonies.simulated`: a rambling one and a Spanish voice note shared with the team, a very short one from an under-18 shared with the church only) at the first finished simulated church, without touching the simulations. Add/Remove simulations add and remove them too.
- Below, **Advice and example stories shown to writers** (a Text picker: Advice or Example stories): one language at a time, Save, and **Translate into every language** (Google, line by line so headings, bullets and bold labels survive; overwrites the other languages).

## Texts from story-only numbers

A text from a number that only has a testimony (no church, no session) isn't answered and doesn't start a church signup; it's logged as `info` from `story`.
