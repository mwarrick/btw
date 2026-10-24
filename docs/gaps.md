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
- **One point of failure for sending.** Every text goes through the n8n relay on a residential IP (76.175.179.85). If that machine or line is down, nothing is sent.
- **Slow requests.** A request takes about 7 seconds end to end, which risks voip.ms retries. Proof of concept only.

## Smaller items (noted, skipped)
- **No alerts for reviewers.** A pastor's reply only shows as an unread badge in `/admin`.
- **RESTART wipes a finished signup.** RESTART after finishing deletes that phone's answers.
- **Page links can't be revoked.** Pastor's page links (`/p/<key>`) never expire, and `/admin` can't revoke them.
- **Simulations are in the live data.** The simulated churches are flagged and badged. Remove them with Conversations → Remove simulations before real signups.
- **Unconfirmed in production.** The Log panel and language detection on a real non-English first text haven't been checked there.

## The front page and the web signup form (`/`, `/signup`)
Protected since 2026-10-24 (`lib/web-guard.js`): the phone is confirmed with a texted 6-digit code before a web signup is saved. There is also a hidden bot field, a 3-second minimum, limits per visitor and per number, and a daily cap on texts (`WEB_TEXTS_PER_DAY`, default 300). What's left:
- **US and Canadian numbers only.** Elsewhere, people can't sign up on the web or by text (see Reach).
- **Visitors are told apart only by IP address.** Many pastors on one church's wifi share one, so that is at most 10 codes an hour from one address. A determined attacker with many addresses is held back only by the daily cap and the per-number limits.
- **No CAPTCHA.** Cloudflare Turnstile can be added if bots get past the hidden field.
- **Short-code texts aren't answered.** Texts from short codes (e.g. WhatsApp's 29283) are only shown in the Log panel; nothing replies to them.
