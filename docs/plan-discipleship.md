# Plan: Track 3, the first 30 days of faith

Status: **plan only, not built.** It builds on Track 2, the baptizee portal (`docs/plan-testimonies.md`). It lives in the same baptizee area, but it is tracked here as its own piece of work.

> How might we help local churches walk a newly baptized person through their first 30 days of following Jesus, so they keep growing and stay rooted in that church?

## The idea in one paragraph

A newly baptized person opts in on their phone and gets **one short text a day for 30 days**, in their language. Each text is a sentence or two plus a link to that day's page: a Bible passage, a few lines, one question and one small step. The steps include praying, telling someone, coming on Sunday, and meeting someone from the church. **Their church stays in the loop** on four check-in days (7, 14, 21, 30). The person is asked a simple question, and the answer goes to the church, not to us. If someone goes quiet, the church is nudged to reach out. The church does the relationship; we do the reminders.

## How it connects to Track 2

- **Shared person record.** Track 2 should store the person (name, language, church, phone if given) in its own table, `btw_baptizees`, with stories attached to it, not as fields on a story. Then a story and a 30-day journey belong to the same person. This is a small change to the Track 2 plan.
- **Same way in.** The same entry points as Track 2: the church's invite link or QR (`/s/<church code>`), and "I was baptized" on the landing page. After sharing a story, or instead of it, they see: *Want a short message every day for your first 30 days?*
- **Inviting a story back.** The journey invites a story back: day 30 (or earlier) asks *Would you share your story?*, linking to Track 2's form, already tied to them.

## Getting started

1. **The person opts in.** They give their first name, mobile number and language, and tick consent. The consent is saved word for word, as for photos. Under 18 needs a parent's agreement. A church can also **add someone** from its own page (first name and phone). That only sends an invitation text, and nothing more is sent until the person replies YES. Texting people who didn't ask is both wrong and a carrier violation.
2. **Day 0** is the welcome text, with a link to their journey page (`/j/<key>`). Like the pastor's page, the private link is the only login. The page shows all days so far, so a missed day can be caught up.
3. **Delivery time.** Texts go out **once a day around 8 am their time.** The time zone comes from the church's country and state, or is asked when it can't be worked out.

## Day by day

| Days | Focus (suggested, content to be decided) | Church touchpoint |
|---|---|---|
| 1–7 | What baptism meant; prayer; reading the Bible (one Gospel) | **Day 7 check-in:** *How's it going? Reply 1 Good, 2 Hard, 3 Have a question* |
| 8–14 | Following Jesus day to day; the church as family; Sunday | **Day 14:** *Have you met someone from {church} this week?*; also invites their story (Track 2) |
| 15–21 | Prayer and Scripture habits; forgiveness; serving | **Day 21:** *Is there something we can pray for?* |
| 22–30 | Telling others; generosity; what's next (small group, class) | **Day 30:** celebration; *What's your next step at {church}?*; invite to share their story |

- **Each day's text** stays under 160 characters (one SMS) and carries the link. In non-Latin scripts that limit is 70 characters, so the text is short and the link does the work.
- **Each day's page** is where the content lives: passage reference and text, about 100 words, one question and one step. It should load fast on a weak connection, like the pastor's page. It also has an optional **"This week at {church}"** line that the church fills in once (service time, address, a contact name), so every day points back to that church.

## Replies and keywords

- **Replies go to the church.** Any reply goes to **their church**, shown on the church's page in a new **Newly baptized** tab. The church sees each person's day, last reply and a "needs a call" flag. Our team sees it all in `/admin` but doesn't answer on the church's behalf.
- **Check-in answers** are kept as data (1/2/3, yes/no), so the church and `/admin` can see who is struggling.
- **Keywords**, in all 10 languages, hand-written as the existing `kw_*` lists:
  - PAUSE stops texts for 7 days;
  - STOP ends the journey;
  - START resumes;
  - HELP;
  - TODAY re-sends today's link.

## Keeping them rooted: nudges to the church

Texts go to the church's contact (the pastor, or a **mentor** the church names for that person). Each one carries their link to the Newly baptized tab:
- **Day 1:** *Maria started her first 30 days. Mentor: you. Say hi this week.*
- After a check-in answered **Hard** or **Have a question**, or **two check-ins with no reply**: *Maria could use a call.*
- **Day 30:** *Maria finished her 30 days. What's her next step?* The church marks one of:
  - joined a group;
  - attending;
  - not connected.

  This answers "stay rooted" with data, not a guess.

## Screens

- **Baptizee:** `/j/<key>`, the journey page (today, past days, pause/stop, link to share their story).
- **Church page** (`/p/<key>`):
  - a **Newly baptized** tab: list, add a person (invitation only), assign a mentor, mark next step;
  - **"This week at {church}"** text;
  - the invite QR, shared with Track 2.
- **/admin** gets a **Discipleship** screen:
  - enrolled, active, paused, finished;
  - reply rate per check-in;
  - where people drop off (by day);
  - per church;
  - a list of anyone flagged with no church action for 3 days.
- **/admin Prompts:** the daily texts and keywords are edited like other prompts. Day pages are longer than 160 characters, so they get their own editor, with the same English-first, translate-then-fix workflow.

## Sending: one number or two?

The signup number assumes any unknown text is a church signing up. A baptizee's reply must not start a church signup.
- **Recommended: a second voip.ms number for baptizees** (about $1/month). Routing is then trivial, the 10DLC campaign can describe this use honestly, and it can be paused without touching church signups.
- **Alternative: one number.** `sms-inbound` checks `btw_baptizees` for the phone before the church flow. This is cheaper, but it mixes two audiences and two kinds of message on one number and one 10DLC campaign.

## Scheduling

- **The daily send** needs a scheduler: **Vercel Cron** calling `api/cron/journeys.js` every hour. It sends whatever is due at about 8 am in each person's time zone. This needs Vercel Pro (Hobby allows only daily cron jobs), unless the n8n relay's scheduler calls the endpoint hourly instead.
- **Sends are idempotent:** each day is recorded as sent, so a retry or a duplicate run never texts twice.
- **Volume:** each person gets about 34 texts plus church nudges. At 10,000 people that's about 350,000 texts. Check voip.ms pricing and limits, and 10DLC throughput, before launch.

## Data (all `btw_`-prefixed)

- **`btw_baptizees`** (shared with Track 2):
  - `id`, `church_phone`, `first_name`, `phone`, `lang`, `tz`;
  - `minor`, `guardian_consent_at`;
  - `journey_key`, `journey_consent_text`, `journey_consent_at`;
  - `started_on`, `day`, `paused_until`, `stopped_at`, `finished_at`;
  - `mentor_name`, `mentor_phone`, `next_step`, `next_step_at`.
- **`btw_journey_days`**: `day`, `lang`, `text` (the SMS, at most 160 characters), `title`, `passage`, `body`, `question`, `step`, `updated_at`.
- **`btw_journey_sends`**: `baptizee_id`, `day`, `kind` ('day' | 'checkin' | 'nudge'), `sent_at`, `message_id`; unique (`baptizee_id`, `day`, `kind`).
- **`btw_checkins`**: `baptizee_id`, `day`, `answer`, `raw`, `at`.
- **Texts** stay in `btw_messages` (phone-keyed, as now), with `thread = 'journey'`.
- **`btw_churches.weekly_note`**, for "This week at {church}".

## Build order

1. **Content first:** 30 days in English, then translated. Nothing else is worth building until this exists, and it's the long pole: 30 days × 10 languages, plus a native-speaker check.
2. The person record (`btw_baptizees`), the opt-in on the Track 2 form, and the journey page `/j/<key>`.
3. The hourly sender, daily texts and keywords (PAUSE/STOP/START/TODAY), on the second number.
4. Check-ins, and replies routed to the church's Newly baptized tab.
5. Church nudges, mentors and the next step on day 30.
6. The /admin Discipleship screen and its numbers.

Rough size: steps 2–6 are about 3–4 sessions, after Track 2 and once the content exists.

## Decisions needed before building

1. **Who writes the 30 days?**
   - Options: the organizers, an existing published plan licensed for this, or churches choosing from a few plans.
   - Theology and tone are the organizers' call, not ours.
2. **Can churches add their own content?** Their own note per day, or only the weekly "This week at {church}" line?
   - Recommended: the weekly line only, to start.
3. **A second number for baptizees?**
   - Recommended: yes.
4. **Who gets the nudges:** the church's contact, a named mentor per person, or both?
5. **Is 30 days fixed,** or can it run longer (e.g. a weekly text until Pentecost 2027)?
6. **Countries where this is risky:** should texts there use discreet wording (no "Jesus", "baptism" in the SMS itself, only on the page), or not be offered?
   - Recommended: offer discreet wording as an opt-in.

## Gaps this would add (for `docs/gaps.md` when built)

- **Safety.** A text about faith can put someone at risk if the wrong person reads their phone. There is only an opt-in for discreet wording, and no stronger protection.
- **Opt-in rests on the person's YES.** A church can add a wrong number, so the YES requirement must hold everywhere.
- **Scheduling depends on an hourly job.** If it fails, a day is late, not lost, because sends are recorded per day.
- **"Rooted" is only what the church reports** on day 30.
