# Known gaps

This is a proof of concept. These gaps are known and kept on purpose for the demo; none are being fixed now. Measured against the brief: *help a pastor anywhere register their church, get resources and report baptisms from the phone they already use, on any connection and in their own language, so every baptism on Pentecost 2027 gets counted.*

## Reach: "a pastor anywhere"
- **One US number only.** Texts come in on a single US DID. `api/sms-inbound.js` ignores any sender that isn't a 10-digit (US/Canada) number, without a reply or a log entry. Pastors outside North America would need WhatsApp (assumed to be the answer) or a local number.
- **10DLC isn't registered.** US carriers can filter or block texts from an unregistered number. Registration costs about $4 for the brand and $15 for the campaign, plus carrier fees.

## Counting on Pentecost 2027
- **No Pentecost-day push.** Nothing reminds churches to report on the day, and no broadcast goes out. The baptism count is "so far" (`baptisms`, `baptisms_at`), not a count for that day.

## Resources
- **Resources are a Dropbox link.** It is the same for every church. Fine: resources won't work well on a phone however they're delivered.

## Language
- **No native-speaker check.** The hand-written translations have not been checked by native speakers. This covers the keyword lists, the fixed prompts, `lang_detected`, `kw_menu` and the web pages' wording, including the signup form's. Acceptable for the demo.

## Reliability
- **One point of failure for sending.** Every text goes through the n8n relay on a residential connection. If that machine or line is down, nothing is sent.
- **Slow requests.** A request takes about 7 seconds end to end, which risks voip.ms retries. Proof of concept only.

## Smaller items (noted, skipped)
- **Alerts are texts only.** Team members can get a text when a pastor writes (Users: Set up alerts); there are no email alerts, and replying to an alert doesn't reach anyone.
- **Page links can't be revoked.** Pastor's page links (`/p/<key>`) never expire, and `/admin` can't revoke them.
- **Simulations are in the live data.** The simulated churches are flagged and badged. Remove them with Conversations → Remove simulations before real signups.
- **Unconfirmed in production.** The Log panel and language detection on a real non-English first text haven't been checked there.

## The front page and the web signup form (`/`, `/signup`)
Protected since 2026-10-24 (`lib/web-guard.js`): the phone is confirmed with a texted 6-digit code before a web signup is saved. There is also a hidden bot field, a 3-second minimum, limits per visitor and per number, and a daily cap on texts (`WEB_TEXTS_PER_DAY`, default 300). What's left:
- **US and Canadian numbers only.** Elsewhere, people can't sign up on the web or by text (see Reach).
- **Visitors are told apart only by IP address.** Many pastors on one church's wifi share one, so that is at most 10 codes an hour from one address. A determined attacker with many addresses is held back only by the daily cap and the per-number limits.
- **No CAPTCHA.** Cloudflare Turnstile can be added if bots get past the hidden field.
- **Short-code texts aren't answered.** Texts from short codes (e.g. WhatsApp's 29283) are only shown in the Log panel; nothing replies to them.

## Baptism testimonies (`/story`)
- **No review before the church sees a story.** A story shared with the church shows on its Stories tab at once. The team can delete only the ones shared with it, and only after the fact.
- **Typed only.** No voice or video recording; the phone keyboard's microphone works for speaking a story.
- **No AI polish.** The guided questions shape the story; nothing rewrites a rambling one (declined earlier).
- **Featuring is a star.** The team marks stories to feature; getting them onto baptize.org is still by hand.
- **The age question is hidden for now** (`ASK_AGE` in `public/story.html` and `public/journey.html`; on the 30 days it means anyone, under-18s included, can give their church a phone number): every new shared story counts as 18+, so no parent is asked. Turning it back on brings back the parent approval below, unchanged.
- **The 18+ answer is taken on trust,** and so is who opens the parent's approval link: whoever the writer sends it to can approve.
- **The phone check proves only the phone.** The link texted to the number shows it's theirs, but anyone can pick any church in the list.
- **Advice translations need checking.** The seeded advice was translated by hand. "Translate into every language" overwrites every other language with Google drafts, which need a native speaker's eye.
- **Texting the link reaches US and Canadian numbers only.** The form takes any country's number; the provider (voip.ms) can't text the rest yet, and the page says so. Another provider changes only `canText` and `sendText` in `lib/voipms.js`.
- **No short video.** Typed only.

## The first 30 days (`/journey`)
- **The plan is a draft.** We wrote the 30 days. A pastor should review them, and the translations are Google drafts until someone checks them ("Translate into every language" on the Discipleship screen).
- **No reminders unless they set them up.** Nothing is texted. Someone who doesn't bookmark the page or add the calendar reminders may not come back; the church's tab shows who has gone quiet.
- **Read it depends on an outside site.** The links go to Bible Gateway, and the version chosen for each language needs checking. Bengali has no link and uses English's.
- **A new 30 days doesn't check the phone.** It opens right away in the browser, so the number typed in isn't proven to be the person's; its link is also texted to that number, and if they allow contact, their church sees it. Typing a number that already has a 30 days only texts its link to that number, never shows it. Starting from a story uses that story's verified number.
- **No add to home screen.** The page can be bookmarked, but it can't be installed like an app.
- **Not by text or WhatsApp.** The brief's main ask: a daily step by text with replies. Online only for now (decided).
- **One plan for every church.** The brief suggested reading the Gospel of John and leaving days 22 to 30 for each church to write. We wrote all 30 days ourselves instead (first lessons, Mark, Acts 2 and the church, living it out), so every church gets the same plan. A church can't add or change days; it can only post the weekly note shown on top of each day. The days are edited by the team on /admin's Discipleship screen.
- **"Quiet" means not opening the page.** Opening it without doing anything still counts as active.
- **+1 day changes real data.** It's for demos; using it on a real person moves their days for good.

