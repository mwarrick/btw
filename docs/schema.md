# Database schema

Supabase project `supabase-cobalt-saddle`, shared with other apps: everything of ours is prefixed `btw_`. Read from the live database on 2026-10-26 (after migration `20261025180000`).

- **Full DDL:** [`supabase/schema.sql`](../supabase/schema.sql) (reference only; the migrations in `supabase/migrations/` are the source of truth).
- **Access:** row level security is on for every table with no policies, so only the service role key, used server-side, reaches the data. The pages never talk to Supabase directly.
- **Storage:** photos live in the private bucket `btw-photos` (another app owns `photos`), reached through signed links.
- **`updated_at`** is set by the trigger function `btw_set_updated_at()` on users, languages, prompts, churches, sessions, testimonies, guides, journeys and journey days.

## Diagram

Solid lines are foreign keys. Dashed lines are joins by phone number (`+1XXXXXXXXXX`) with no foreign key: a church's session, texts and photos all share its `phone`.

```mermaid
erDiagram
  btw_users {
    uuid id PK
    text email UK
    text name
    text password_hash
    int session_version
    bool active
    timestamptz last_login_at
    text alert_phone
  }
  btw_languages {
    text code PK
    text name
    text menu_label
    int menu_order
    bool active
  }
  btw_prompt_keys {
    text key PK
    text section
    text description
    text_array placeholders
    int sort_order
  }
  btw_prompts {
    text key PK,FK
    text lang PK,FK
    text text
  }
  btw_guides {
    text key PK
    text lang PK
    text body
    uuid updated_by FK
  }
  btw_churches {
    uuid id PK
    text phone UK
    text lang FK
    text status
    text name
    text email
    text church_name
    text country
    text street
    text city
    text state
    text zip
    text denomination
    text website
    text contact_name
    text contact_phone
    bool baptism_same
    text baptism_street
    text baptism_city
    text baptism_state
    text baptism_zip
    bool public_map
    timestamptz consent_at
    timestamptz completed_at
    uuid edited_by FK
    timestamptz edited_at
    bool simulated
    text profile_key UK
    int baptisms
    timestamptz baptisms_at
    int baptisms_pending
    timestamptz baptisms_pending_at
    bool photos_allowed
    timestamptz photos_allowed_at
    text photos_consent_text
    text weekly_note
  }
  btw_sessions {
    text phone PK
    text lang FK
    text phase
    text_array queue
    bool editing
  }
  btw_messages {
    bigint id PK
    text provider_id UK
    text phone
    text direction
    text body
    text thread
    timestamptz read_at
    text translation
    uuid sent_by FK
    text_array media
    text error
  }
  btw_photos {
    bigint id PK
    text phone
    text path UK
    text thumb_path
    text source
    timestamptz consent_at
    text consent_text
    timestamptz declined_at
    bigint message_id FK
    uuid uploaded_by FK
    timestamptz seen_at
  }
  btw_events {
    bigint id PK
    text level
    text source
    text phone
    text message
    jsonb detail
  }
  btw_web_requests {
    bigint id PK
    text kind
    text ip
    text phone
  }
  btw_web_codes {
    text phone PK
    text code_hash
    int attempts
    timestamptz expires_at
  }
  btw_testimonies {
    bigint id PK
    text phone UK
    uuid church_id FK
    text lang
    text key UK
    text first_name
    text body
    jsonb answers
    text share
    bool adult
    text consent_text
    timestamptz consent_at
    text guardian_key UK
    text guardian_name
    timestamptz guardian_at
    timestamptz guardian_declined_at
    timestamptz submitted_at
    timestamptz seen_at
    timestamptz featured_at
    timestamptz featured_texted_at
    timestamptz saved_texted_at
    bool simulated
  }
  btw_journeys {
    bigint id PK
    text key UK
    uuid church_id FK
    bigint testimony_id FK
    text first_name
    text lang
    text phone
    bool contact_ok
    text consent_text
    timestamptz consent_at
    date started_on
    text tz
    int_array done_days
    text next_step
    timestamptz talked_at
    timestamptz seen_at
    bool adult
    bool simulated
  }
  btw_checkins {
    bigint id PK
    bigint journey_id FK
    int day
    text answer
    text note
  }
  btw_journey_days {
    int day PK
    text lang PK
    text theme
    text passage
    text note
    text question
    text step
    uuid updated_by FK
  }

  btw_prompt_keys ||--o{ btw_prompts : "text per language"
  btw_languages ||--o{ btw_prompts : ""
  btw_languages |o--o{ btw_churches : "signup language"
  btw_languages |o--o{ btw_sessions : ""
  btw_users |o--o{ btw_churches : "edited_by"
  btw_users |o--o{ btw_messages : "sent_by"
  btw_users |o--o{ btw_photos : "uploaded_by"
  btw_users |o--o{ btw_guides : "updated_by"
  btw_users |o--o{ btw_journey_days : "updated_by"
  btw_churches ||..o| btw_sessions : "phone"
  btw_churches ||..o{ btw_messages : "phone"
  btw_churches ||..o{ btw_photos : "phone"
  btw_messages |o--o{ btw_photos : "texted with"
  btw_churches |o--o{ btw_testimonies : "church_id"
  btw_churches |o--o{ btw_journeys : "church_id"
  btw_testimonies |o--o{ btw_journeys : "started from story"
  btw_journeys ||--o{ btw_checkins : "days 7, 14, 21, 30"
```

## Tables

| Table | Holds | Feature doc |
|---|---|---|
| `btw_churches` | One signup per phone: every answer, status, the `/p/<key>` link, baptism count, photo choice, weekly note, who last edited it | [sms-signup](features/sms-signup.md), [pastor-page](features/pastor-page.md) |
| `btw_sessions` | Where each phone is in the text conversation: phase, language, questions left, editing | [sms-signup](features/sms-signup.md) |
| `btw_messages` | Every text in and out, in the `signup` or `team` thread, with read state, English translation, sender, MMS links and send error | [team-messages](features/team-messages.md) |
| `btw_photos` | Church photos in the `btw-photos` bucket: paths, where they came from, permission | [photos](features/photos.md) |
| `btw_events` | The Log panel: errors, warnings and info | [admin](features/admin.md#log-panel) |
| `btw_users` | /admin logins (scrypt hashes; removed users stay with `active = false`) and alert phones | [admin](features/admin.md#users) |
| `btw_languages` | The 10 languages: on/off, menu label and order | [prompts-and-languages](features/prompts-and-languages.md) |
| `btw_prompt_keys` | One row per message: description and the `{placeholders}` it must keep | [prompts-and-languages](features/prompts-and-languages.md) |
| `btw_prompts` | Each message's text in each language (more than 1000 rows: read with `dbAll()`) | [prompts-and-languages](features/prompts-and-languages.md) |
| `btw_guides` | Longer per-language texts: `testimony` (advice), `story_examples`, `bible_url`, `features` | [testimonies](features/testimonies.md), [first-30-days](features/first-30-days.md), [front-page](features/front-page.md) |
| `btw_web_requests` | One row per web request that may send a text, for rate limits and the daily cap (IP as a salted hash) | [web-signup](features/web-signup.md#spam-protection) |
| `btw_web_codes` | The 6-digit signup code per phone (salted hash, expiry, tries) | [web-signup](features/web-signup.md#spam-protection) |
| `btw_testimonies` | One story per phone: answers, story, who may read it, parent's OK, team read/featured | [testimonies](features/testimonies.md) |
| `btw_journeys` | One person's first 30 days: church, start date and time zone, days done, consent, contact, next step | [first-30-days](features/first-30-days.md) |
| `btw_checkins` | Check-ins on days 7, 14, 21 and 30 | [first-30-days](features/first-30-days.md) |
| `btw_journey_days` | The 30 days' content per language | [first-30-days](features/first-30-days.md) |

## Allowed values (check constraints)

| Column | Values |
|---|---|
| `btw_churches.status` | `in_progress`, `complete`, `opted_out` |
| `btw_sessions.phase` | `lang`, `collect`, `summary` (no longer used), `done`, `stopped` |
| `btw_messages.direction` | `in`, `out` |
| `btw_messages.thread` | `signup`, `team` |
| `btw_photos.source` | `web`, `sms`, `admin` |
| `btw_events.level` | `error`, `warning`, `info` |
| `btw_prompt_keys.section` | `system`, `fields`, `summary`, `keywords` |
| `btw_web_requests.kind` | `code`, `link`, `welcome`, `bot`, `story`, `journey`, `journey_link`, `guardian`, `story_saved` (a new kind needs a migration; see `CLAUDE.md`) |
| `btw_testimonies.share` | `me`, `church`, `baptize` |
| `btw_journeys.next_step` | `group`, `serve`, `class`, `unsure` |
| `btw_checkins.day` / `answer` | `7`, `14`, `21`, `30` / `good`, `hard`, `question` |
| `btw_journey_days.day` | 1 to 30 |

## Things to know

- **Phone is the real key** for the signup side: `btw_churches.phone` is unique, and sessions, messages, photos, events, web requests and codes all use the same `+1XXXXXXXXXX` form without a foreign key. Deleting a conversation in /admin removes its session, answers, texts, photos and logged problems.
- **Simulations and samples** are flagged with `simulated` on churches, testimonies and journeys; they're never texted.
- **Links are keys:** `btw_churches.profile_key` (`/p/`), `btw_testimonies.key` (`/s/`) and `guardian_key` (`/g/`), `btw_journeys.key` (`/j/`). Each is the only login to its page.
- **Deleting a church** leaves its stories and journeys in place with `church_id` set to null; deleting a journey deletes its check-ins.
