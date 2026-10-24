# Plan: testimony sharing and a three-portal landing page

Status: **plan only, not built.**

> How might we help someone who was just baptized tell their story in their own words and share it, without anyone at their church having to produce it, so that one baptism invites the next?

## 1. Landing page: three portals

`/` becomes a short landing page with three large buttons, in the visitor's browser language (picker at the top, same as the signup form):

| Portal | Who | Goes to |
|---|---|---|
| **Church organizers** | pastors / church contacts | `/signup` (the web form, already built) or *Text us at (714) 716-5116*. Plus **"Already signed up? Get my link"**. |
| **I was baptized** | baptizees | `/story` (new, below) |
| **Team** | reviewers / admins | `/admin` (small link at the bottom, not a big button) |

- "Organizers" here means the churches' pastors and contacts. If organizers are meant to be a separate role (e.g. regional coordinators over many churches), that is a fourth thing to design.
- **Get my link** (new, small): the organizer types their phone. If it has a signup, the page link is texted to that number, never shown on screen. This lets a pastor who lost the link get back in without a reviewer. It needs a rate limit (per phone and per IP).
- The signup form is already at `/signup`, so building the landing page only replaces `/`.

## 2. Testimony sharing (baptizee portal)

### How a baptizee arrives
1. **The church's invite link (main path).** Each church gets an invite link and a QR code on its own page (new card: *Invite your baptized to share their story*), e.g. `/s/<church code>`. The pastor prints the QR or forwards the link on WhatsApp. Nobody at the church writes or edits anything. The story is already tied to the church.
2. **The landing page's "I was baptized" button.** It goes to `/story`, which first asks *Which church baptized you?* (search by name or city), with *I'm not sure* allowed.
3. **Later, optional: by text or WhatsApp.** The signup number belongs to churches (any text starts a church signup), so this needs a keyword (e.g. STORY) or a separate number. Not in the first version.

### The story form (`/s/<code>`, mobile-first, same look as the pastor's page)
- Language picker; the browser's language is the default.
- **Guided prompts, not a blank box.** There are three short questions, each optional. The phone keyboard's microphone works for dictating, which helps people who don't write much.
  1. What was your life like before?
  2. What made you decide to be baptized?
  3. What would you say to someone thinking about it?
- First name or initials only (the default). There is no surname field.
- One optional photo, reusing the existing photo upload (shrunk to 2048 px and stripped of location data).
- Consent, recorded word for word like photo consent (`consent_text`, `consent_at`):
  - *My story may be shared publicly, including on social media.*
  - *I'm under 18*: if ticked, a parent or guardian must also agree, with a second box.
- **Who can see it**, a choice:
  - **Share publicly** (default);
  - **Only my church**;
  - **Anonymous** (no name or photo shown). This matters for "anywhere", since some countries make a public baptism dangerous.
- On submit they get:
  - their **public story page** with share buttons;
  - a **private edit link** (like `/p/<key>`), to change or delete the story later. "Bookmark this", plus an optional "text me this link" field.

### The shared story page (`/story/<id>`): how one baptism invites the next
- Server-rendered (`api/story.js`) so WhatsApp, Facebook and iMessage show a proper preview. The preview carries `og:title` ("Maria's baptism story"), `og:description` (the first lines) and `og:image` (their photo or a branded Baptize 2027 card).
- Share buttons:
  - the phone's own **Share** (Web Share API, which covers WhatsApp, SMS and Instagram where installed);
  - WhatsApp;
  - Facebook;
  - Copy link.
- **The invitation**, at the bottom, in the reader's language: *Thinking about baptism?* It links to the church's details (name, city, website, if the church chose to be on the public map), or *Text us and we'll connect you* (decision needed: who answers those texts?).
- *See in English* / *See in my language* uses Google Translate, as in the team messages. The original stays as written.
- Nothing on the page links back to the person's other details.

### What churches and the team see
- **Church page** (`/p/<key>`): a new **Stories** tab lists their congregation's stories (read-only), plus the invite link and QR code. The church cannot edit stories, which keeps them in the person's own words. Whether the church can hide one is decision 2 below.
- **/admin**: a new **Stories** screen lists every church's stories, newest first. It shows status, language and a translation. Reviewers can **Hide** (abuse, safety) and **Feature** (for a public gallery or social posts). Stories in "Only my church" mode never appear publicly.

### Data (all `btw_`-prefixed, in the shared Supabase project)
- `btw_churches.invite_code`: short and random (about 8 characters), made the first time the Stories tab or QR is shown.
- `btw_stories`:
  - `id`, `church_phone` (nullable, for "not sure"), `lang`, `first_name`;
  - `answers jsonb` (the three prompts), `photo_path`;
  - `visibility` ('public' | 'church' | 'anonymous'), `minor`;
  - `consent_text`, `consent_at`, `guardian_consent_at`;
  - `edit_key`, `public_id`;
  - `status` ('published' | 'hidden'), `featured_at`, `featured_by`;
  - `created_at`, `edited_at`.
- Photos: the existing private `btw-photos` bucket under `stories/`. The public page uses short-lived signed links, or a public copy made only for public stories (a decision for the build).
- Prompts: `story_*` keys in all 10 languages, hand-translated, each at most 160 characters, as now.

### Build order (each step usable on its own)
1. Landing page at `/` plus **Get my link**.
2. Invite code and QR on the church's page; the story form with consent; the private edit link.
3. The public story page with link previews and share buttons, and the invitation at the bottom.
4. /admin Stories screen (hide/feature) and the church's Stories tab.
5. Optional: a public gallery of featured stories; story by text/WhatsApp; short video.

Rough size: steps 1–4 are similar to the photos work (about 2–3 sessions), mostly reusing the pastor's page, photo upload, consent recording and translation.

## Decisions needed before building
1. **Publish at once, or review first?**
   - Recommended: the person's own share link works immediately, so they can share right away.
   - Anything public that *we* show (a gallery, featured stories, social posts) waits for a reviewer's Feature.
   - Reviewers can Hide at any time.
2. **Can churches hide a story from their congregation, or only the team?**
3. **Who answers "Thinking about baptism?"** The church directly (their contact details), or our number routed to that church's team thread?
4. **Anonymous stories:** allowed?
   - Recommended: yes, given "anywhere".
5. **Does "Organizers" mean church pastors**, as assumed here, or a separate coordinator role?
6. **Video:** later, or never?
   - Recommended: later. It is heavy on weak connections and needs moderation.

## Gaps this would add (for `docs/gaps.md` when built)
- **No verification of the story form.** No login or verification: spam and fake stories need a rate limit, a honeypot, and the Hide button.
- **Minors.** Consent relies on a ticked box, not a verified parent.
- **Translated stories** are machine translations of personal words. They are labelled as such.
