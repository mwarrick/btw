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
- **No rate limiting.** Anyone can post signups as fast as they like.
- **No phone verification.** The number typed isn't confirmed by a code, so a web signup can claim any number. The real owner then finds it "already signed up" (409), and their texts are treated as a finished signup that isn't theirs. Only a reviewer can clear it, with Delete in the conversation.
- **Texting works only for US/Canada numbers.** The form accepts international numbers (`+` and 8 to 15 digits), but texts from them aren't handled (see Reach).
- **No spam protection.** There is no CAPTCHA or honeypot.
- **Get my link is limited per number, not per visitor.** One text per number per 10 minutes, but someone could make it text many signed-up numbers (each gets only its own link, so nothing leaks).
- **No text on web signup.** The form sends nothing, though its phone hint says "We'll text you here".
