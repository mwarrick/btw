-- btw: current database schema (reference only; not a migration, don't run it).
-- Read from the live Supabase project on 2026-10-26,
-- after migration 20261025180000. The migrations in supabase/migrations/ are the
-- source of truth; refresh this file after each new one.
--
-- Only btw_ objects: the project is shared with other apps.
-- Row level security is on for every table, with no policies, so only the
-- service role key (server-side) reaches the data.
-- Diagram and notes: docs/schema.md.

-- Sets updated_at on every UPDATE (trigger btw_<table>_updated_at on users,
-- languages, prompts, churches, sessions, testimonies, guides, journeys, journey_days).
-- create function btw_set_updated_at() returns trigger ...

-- ---------------------------------------------------------------------------
-- Team logins
-- ---------------------------------------------------------------------------

create table btw_users (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  name            text not null,
  password_hash   text not null,                 -- scrypt
  session_version integer not null default 1,    -- bumped to sign someone out everywhere
  active          boolean not null default true, -- removal is soft
  last_login_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  alert_phone     text                           -- text alerts for team messages
);

-- ---------------------------------------------------------------------------
-- Wording: languages, prompts, long texts
-- ---------------------------------------------------------------------------

create table btw_languages (
  code       text primary key,                   -- en, es, zh, ...
  name       text not null,
  menu_label text not null,                      -- the language's own name
  menu_order integer not null,
  active     boolean not null default false,
  updated_at timestamptz not null default now()
);

create table btw_prompt_keys (
  key          text primary key,
  section      text not null check (section in ('system', 'fields', 'summary', 'keywords')),
  description  text not null,
  placeholders text[] not null default '{}',     -- {placeholders} a translation must keep
  sort_order   integer not null
);

create table btw_prompts (
  key        text not null references btw_prompt_keys (key) on update cascade on delete cascade,
  lang       text not null references btw_languages (code) on update cascade on delete cascade,
  text       text not null,                      -- at most 160 characters (enforced in code)
  updated_at timestamptz not null default now(),
  primary key (key, lang)
);

-- Longer texts per language: 'testimony' (advice), 'story_examples',
-- 'bible_url', 'features' (translated "How it works").
create table btw_guides (
  key        text not null,
  lang       text not null,
  body       text not null,
  updated_by uuid references btw_users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (key, lang)
);

-- ---------------------------------------------------------------------------
-- Churches and their signup conversation (all joined by phone, +1XXXXXXXXXX)
-- ---------------------------------------------------------------------------

create table btw_churches (
  id                  uuid primary key default gen_random_uuid(),
  phone               text not null unique,      -- one church per phone
  lang                text references btw_languages (code),
  status              text not null default 'in_progress'
                        check (status in ('in_progress', 'complete', 'opted_out')),
  name                text,                      -- the person signing up
  email               text,
  church_name         text,
  country             text,                      -- 'US', typed country, or null (= US)
  street              text,
  city                text,
  state               text,                      -- state, or any region outside the US
  zip                 text,                      -- ZIP, or postal code outside the US
  denomination        text,
  website             text,
  contact_name        text,
  contact_phone       text,
  baptism_same        boolean,                   -- baptisms at the church's address?
  baptism_street      text,
  baptism_city        text,
  baptism_state       text,
  baptism_zip         text,
  public_map          boolean,
  consent_at          timestamptz,
  completed_at        timestamptz,               -- set when the signup first finishes
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  edited_by           uuid references btw_users (id),  -- null with edited_at = edited by the pastor
  edited_at           timestamptz,
  simulated           boolean not null default false,
  profile_key         text unique,               -- the /p/<key> link
  baptisms            integer,
  baptisms_at         timestamptz,
  baptisms_pending    integer,                   -- a big jump waiting for YES
  baptisms_pending_at timestamptz,
  photos_allowed      boolean,                   -- the church's one photo choice; null = not asked yet
  photos_allowed_at   timestamptz,
  photos_consent_text text,
  weekly_note         text                       -- shown on the 30 days' pages
);

create table btw_sessions (
  phone      text primary key,                   -- = btw_churches.phone
  lang       text references btw_languages (code),
  phase      text not null default 'lang'
               check (phase in ('lang', 'collect', 'summary', 'done', 'stopped')),
  queue      text[] not null default '{}',       -- questions still to ask
  editing    boolean not null default false,
  updated_at timestamptz not null default now()
);

create table btw_messages (
  id          bigint generated always as identity primary key,
  provider_id text unique,                       -- voip.ms id; a repeat is a retry
  phone       text not null,
  direction   text not null check (direction in ('in', 'out')),
  body        text not null,
  created_at  timestamptz not null default now(),
  error       text,                              -- why a reply wasn't sent
  thread      text not null default 'signup' check (thread in ('signup', 'team')),
  read_at     timestamptz,
  translation text,                              -- Google's English
  sent_by     uuid references btw_users (id),
  media       text[]                             -- MMS attachment links
);
create index btw_messages_phone_created_idx on btw_messages (phone, created_at);
create index btw_messages_unread_idx on btw_messages (phone)
  where thread = 'team' and direction = 'in' and read_at is null;

-- Files live in the private Storage bucket 'btw-photos'.
create table btw_photos (
  id           bigint generated always as identity primary key,
  phone        text not null,
  path         text not null unique,
  thumb_path   text,
  source       text not null default 'web' check (source in ('web', 'sms', 'admin')),
  content_type text not null default 'image/jpeg',
  bytes        integer,
  width        integer,
  height       integer,
  consent_at   timestamptz,
  consent_text text,
  message_id   bigint references btw_messages (id) on delete set null,
  uploaded_by  uuid references btw_users (id),
  seen_at      timestamptz,
  created_at   timestamptz not null default now(),
  declined_at  timestamptz
);
create index btw_photos_phone_idx on btw_photos (phone, id desc);

create table btw_events (
  id         bigint generated always as identity primary key,
  level      text not null check (level in ('error', 'warning', 'info')),
  source     text not null,
  phone      text,
  message    text not null,
  detail     jsonb,
  created_at timestamptz not null default now()
);
create index btw_events_created_idx on btw_events (created_at desc);

-- ---------------------------------------------------------------------------
-- Web forms: rate limits and texted codes
-- ---------------------------------------------------------------------------

create table btw_web_requests (
  id         bigint generated always as identity primary key,
  kind       text not null check (kind in ('code', 'link', 'welcome', 'bot', 'story',
               'journey', 'journey_link', 'guardian', 'story_saved')),
  ip         text,                               -- salted hash
  phone      text,
  created_at timestamptz not null default now()
);
create index btw_web_requests_ip_idx    on btw_web_requests (ip, created_at desc);
create index btw_web_requests_kind_idx  on btw_web_requests (kind, created_at desc);
create index btw_web_requests_phone_idx on btw_web_requests (phone, created_at desc);

create table btw_web_codes (
  phone      text primary key,
  code_hash  text not null,                      -- salted hash of the 6-digit code
  attempts   integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Testimonies
-- ---------------------------------------------------------------------------

create table btw_testimonies (
  id                   bigint generated always as identity primary key,
  phone                text not null unique,     -- one story per phone
  church_id            uuid references btw_churches (id) on delete set null,
  lang                 text not null default 'en',
  key                  text not null unique,     -- the /s/<key> link
  first_name           text,
  body                 text,
  consent_text         text,
  consent_at           timestamptz,
  submitted_at         timestamptz,
  seen_at              timestamptz,              -- read by the team
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  answers              jsonb,                    -- the guided questions
  share                text check (share in ('me', 'church', 'baptize')),
  adult                boolean,
  guardian_name        text,
  guardian_at          timestamptz,
  featured_at          timestamptz,
  simulated            boolean not null default false,
  guardian_key         text unique,              -- the /g/<key> link
  guardian_declined_at timestamptz,
  featured_texted_at   timestamptz,
  saved_texted_at      timestamptz
);
create index btw_testimonies_church_idx on btw_testimonies (church_id);

-- ---------------------------------------------------------------------------
-- The first 30 days
-- ---------------------------------------------------------------------------

create table btw_journeys (
  id           bigint generated always as identity primary key,
  key          text not null unique,             -- the /j/<key> link
  church_id    uuid references btw_churches (id) on delete set null,
  testimony_id bigint references btw_testimonies (id) on delete set null,
  first_name   text not null,
  lang         text not null default 'en',
  phone        text,
  contact_ok   boolean not null default false,   -- church may contact them
  consent_text text,
  consent_at   timestamptz,                      -- church may see their progress
  started_on   date not null,
  tz           text not null default 'UTC',
  done_days    integer[] not null default '{}',
  next_step    text check (next_step in ('group', 'serve', 'class', 'unsure')),
  talked_at    timestamptz,                      -- "We talked"
  seen_at      timestamptz,                      -- last opened their page
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  simulated    boolean not null default false,
  adult        boolean
);
create index btw_journeys_church_idx on btw_journeys (church_id);

create table btw_checkins (
  id         bigint generated always as identity primary key,
  journey_id bigint not null references btw_journeys (id) on delete cascade,
  day        integer not null check (day in (7, 14, 21, 30)),
  answer     text not null check (answer in ('good', 'hard', 'question')),
  note       text,
  created_at timestamptz not null default now(),
  unique (journey_id, day)
);

create table btw_journey_days (
  day        integer not null check (day >= 1 and day <= 30),
  lang       text not null,
  theme      text not null,
  passage    text not null,
  note       text not null,
  question   text not null,
  step       text not null,
  updated_by uuid references btw_users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (day, lang)
);
