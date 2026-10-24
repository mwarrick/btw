# Plan: the first 30 days of faith

Status: **plan only, not built.** Revised on 2026-10-24 after the user's decisions:
- **Online only** in this prototype: no daily texts.
- **The plan:** a simple 30-day plan found and assembled from common practice (below).
- **Flags go to the church contact.** People who say "Hard", "I have a question", or go quiet are flagged on the church's page; nobody is texted.
- **30 days, fixed.**

> How might we help local churches walk a newly baptized person through their first 30 days of following Jesus, so they keep growing and stay rooted in that church?

## In one paragraph

A newly baptized person starts their **30 days** from the testimony page or the front page. They get a private page, `/j/<key>`, that is theirs alone. One new day opens each day:
- a short Bible passage (with a link to read it in their language);
- a few lines on it;
- one question to think about;
- one small step to take.

On days **7, 14, 21 and 30** the page asks how it's going. The answer goes to **their church's page** (a new *Newly baptized* tab), where the pastor sees who is on which day and who could use a call. The church does the relationship; the page does the daily rhythm.

## The 30 days (draft for the team to review)

This draft is assembled from common practice for new believers, not taken from a copyrighted plan:
- Week 1 follows the classic "first lessons" (the Navigators' *Beginning with Christ*: assurance, forgiveness, prayer, guidance, victory).
- Week 2 reads key moments in **Mark**, the shortest Gospel, which is widely recommended as a first book.
- Week 3 is about the church, starting from **Acts 2**.
- Week 4 is about living it out and telling others.

Passages are references only. Each language links to a free Bible (see *Bible text*). The notes, questions and steps are short, written by us, and edited in `/admin`.

| Day | Theme | Passage | Small step |
|---|---|---|---|
| **Week 1** | **New life** | | |
| 1 | What your baptism means | Romans 6:3–11 | Write down the date of your baptism. |
| 2 | You belong to God, for sure | 1 John 5:11–13 | Read verse 13 out loud. |
| 3 | Forgiven | 1 John 1:5–2:2 | Thank God for one thing he has forgiven you. |
| 4 | Talking with God | Matthew 6:5–13 | Pray the Lord's Prayer slowly. |
| 5 | God hears you | John 16:23–24; Philippians 4:6–7 | Tell God one worry today. |
| 6 | God speaks through the Bible | Psalm 119:105; 2 Timothy 3:14–17 | Pick a time of day for reading. |
| 7 | Help when tempted | 1 Corinthians 10:13 | **Check-in:** how's it going? |
| **Week 2** | **Meet Jesus (Mark)** | | |
| 8 | Jesus calls ordinary people | Mark 1:14–20 | Notice who Jesus calls. |
| 9 | Jesus forgives and heals | Mark 2:1–12 | Pray for someone who is sick or hurting. |
| 10 | Peace in the storm | Mark 4:35–41 | Name one fear and give it to God. |
| 11 | Who is Jesus to you? | Mark 8:27–38 | Answer Jesus' question in your own words. |
| 12 | The greatest is the servant | Mark 10:42–45 | Do one kind thing quietly. |
| 13 | The cross | Mark 15:21–39 | Thank Jesus for dying for you. |
| 14 | He is risen | Mark 16:1–8 | **Check-in:** have you met someone from your church this week? |
| **Week 3** | **Belonging** | | |
| 15 | The first church | Acts 2:36–47 | Find out when your church meets this week. |
| 16 | Don't go it alone | Hebrews 10:23–25 | Go to church or a small group. |
| 17 | One body, many parts | 1 Corinthians 12:12–27 | Ask your pastor how you could help. |
| 18 | Love one another | John 13:34–35 | Encourage someone from church. |
| 19 | Forgiving others | Matthew 18:21–35 | Forgive someone in your heart. |
| 20 | Carry each other's burdens | Galatians 6:1–2, 9–10 | Ask someone how you can pray for them. |
| 21 | Use what God gave you | 1 Peter 4:8–11 | **Check-in:** is there something we can pray for? |
| **Weeks 4–5** | **Living it out** | | |
| 22 | Led by the Spirit | Galatians 5:16–25 | Pick one fruit of the Spirit to ask for. |
| 23 | Peace instead of worry | Philippians 4:4–9 | Write down three things you're thankful for. |
| 24 | Doing what it says | James 1:19–27 | Put one verse you read into practice. |
| 25 | What you treasure | Matthew 6:19–34 | Trust God with one need today. |
| 26 | New clothes for a new life | Colossians 3:12–17 | Be patient with someone today. |
| 27 | Ready to tell your story | 1 Peter 3:15–16 | **Share your story** (link to `/s/<key>` or `/story`). |
| 28 | Go and make disciples | Matthew 28:18–20 | Tell one person what Jesus did for you. |
| 29 | Nothing can separate you | Romans 8:31–39 | Read verse 38–39 to yourself again. |
| 30 | Keep going | Philippians 1:6; 3:12–14 | **Check-in:** what's your next step at your church? |

Before anything ships, the team (or a pastor they trust) reviews the themes, passages and every note. The organizers decide the theology and the tone.

## How it works

- **Starting.**
  - From the testimony page (`/s/<key>`): after saving their story, **Start my first 30 days**. Their first name, church and language carry over, and the testimony link already proved their phone.
  - From the front page: the *I was baptized* card also gets a **First 30 days** button: pick a language and church, enter a first name, tick consent. No phone is needed, since nothing is texted.

  Either way they get `/j/<key>`, a private link, which is the only login, like the church page. The page says plainly: *bookmark this*. If they started from a testimony, the link is also on that page.
- **Reminders without texts.**
  - The page offers **Add to my calendar**: a downloaded `.ics` file with a daily event at a time they pick (8 am by default) for 30 days, each linking to their page.
  - It also offers **Add to home screen**: a small web-app manifest, so the page opens like an app.

  Both work offline-first and cost nothing. They're optional.
- **One day a day.** Day N opens on the Nth calendar day after starting, in the phone's time zone. Missed days stay open to catch up; future days stay closed. Each day has **Done**. The page shows a simple 30-dot progress row.
- **Check-ins (days 7, 14, 21, 30).** Three big buttons: **Going well**, **It's hard**, **I have a question**, plus an optional note. Day 30 also asks **What's your next step?**:
  - join a small group;
  - serve;
  - take a class;
  - not sure yet.
- **Bible text.** Each day shows the reference and a **Read it** button that opens the passage in a free online Bible in their language. In `/admin`, each language's Bible link is a setting (a URL pattern with `{book}`, `{chapter}`). Public-domain translations exist for several languages, which matters if we later show the text on the page itself; we haven't checked a version for every language yet:
  - World English Bible (en);
  - Reina-Valera 1909 (es);
  - Louis Segond 1910 (fr).
- **Language.** The page and the day content are in their language, with English where a translation is missing. The texts are hand-checked, like the prompts.

## For the church (its page, new *Newly baptized* tab)

- **The list.** Everyone doing the 30 days who picked this church: first name, today's day, last check-in and their note.
- **Could use a call.** This flag is set when someone answers *It's hard* or *I have a question*, or misses a check-in by 3 days. It shows on the tab, and as a count on the tab name.
- **Contact details.** A phone number shows only if the person ticked **My church may contact me** and gave one. If they came from a testimony, the number is their verified one.
- **Marking next steps.** **Mark: talked with them** clears the flag. On day 30 the pastor can mark the person's next step (*joined a group*, *attending*, *not connected*), which answers "stayed rooted" with data.
- **This week at {church}.** One line the church writes, such as the service time or a contact name, shown on every day's page. It's optional.

## For the team (`/admin`)

- **Discipleship screen:**
  - started, active this week, finished;
  - check-in answers by day;
  - where people stop (by day);
  - a per-church list;
  - everyone flagged with no church action for 3 days.
- **The plan editor:** one day at a time, per language: theme, passage, note, question, step. It works like the testimony advice: edit the English, **Translate into every language** for drafts, then check each one.

## Data (all `btw_`)

- **`btw_journeys`:**
  - identity and links: `id`, `key` (the private link), `church_id`, `testimony_id` (if started from a story);
  - the person: `first_name`, `lang`, `phone` (optional), `contact_ok`, `consent_text`, `consent_at`;
  - progress: `started_on` (date), `tz`, `done_days int[]`, `next_step`, `next_step_at`;
  - church follow-up: `flag_at`, `church_seen_at`;
  - `created_at`.
- **`btw_journey_days`:** `day`, `lang`, `theme`, `passage`, `note`, `question`, `step`, `updated_at`, `updated_by`. Seeded with the English draft above, then hand-translated.
- **`btw_checkins`:** `journey_id`, `day`, `answer` (`good` / `hard` / `question`), `note`, `created_at`, `seen_at`.
- **`btw_churches.weekly_note`.**
- **Bible links per language:** a setting in `btw_prompts` (English-only style keys `bible_url_<lang>`) or a small table.

## Build order

1. **The 30 days.** Review and finalize the English content (the table above, plus a note, question and step for each day), then translate. This is the long pole; nothing else is useful without it.
2. **The journey page `/j/<key>`.** Start from a testimony and from the front page; one day a day; Done; Bible links; calendar file.
3. **Check-ins**, and the church's *Newly baptized* tab with flags and next steps.
4. **The `/admin` screens.** The Discipleship numbers and the plan editor.

Rough size: steps 2–4 are about 2 sessions, similar to testimonies. Step 1 depends on the review.

## Decisions still open

1. **The plan above:** approve it, change it, or have a pastor review it first? Also, who signs off on the notes?
2. **How the days open:** one new day per calendar day (recommended: steady rhythm, matches "first 30 days"), or self-paced (next day opens when they press Done)?
3. **Bible text:** link out to a free online Bible per language (recommended, light), or show the passage on the page from public-domain texts (heavier: needs a vetted version for each of the 10 languages)?
4. **Who can start:** only people who wrote a testimony (their phone is verified), or anyone from the front page too (recommended; nothing is texted, so there's nothing to abuse)?

## Gaps this would add (for `docs/gaps.md` when built)

- **No reminders unless they set them up.** Without texts, someone who doesn't bookmark the page or add the calendar reminders may not come back. The church tab shows who has gone quiet.
- **The plan needs review.** A draft written by us needs a pastor's review and native-speaker checks in 10 languages.
- **Links to an outside Bible site** depend on that site staying up.

## Sources consulted

- [Navigators: Growing in Christ series](https://www.navigators.org/?p=1594) and [The Next Steps guide](https://navadmin.tyndale.com/wp-content/uploads/The-Next-Steps_Explore-God.pdf): the classic first lessons (assurance, answered prayer, victory, forgiveness, guidance).
- [Every Nation's One-2-One plan on Bible.com](https://my.bible.com/reading-plans/20-one-2-one/day/2): trusting Christ, small group, weekly worship, daily reading, telling others.
- [Evansville Christian: Discipling new believers](https://www.evansvillechristian.org/discipling-new-believers/): start in Mark or John; connect them to a local church.
- [Disciplepair: Discipleship for new believers](https://www.disciplepair.com/blog/discipleship-for-new-believers): the first 90 days set the rhythms of Scripture, prayer and church.
- [World English Bible copyright (public domain)](https://ebible.org/eng-web/copyright.htm) and [Louis Segond 1910 (public domain)](https://eBible.org/fraLSG/copyright.htm).
