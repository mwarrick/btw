-- Schema for the btw SMS church signup.
--
-- Everything is prefixed btw_ because this Supabase project is shared
-- with other apps.
--
-- Every table has row level security on and no policies, so only the
-- service role key (used by the Vercel functions) can read or write.
-- Nothing here is reachable from a browser directly.

create or replace function btw_set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Languages offered in the first-contact menu. The admin editor turns
-- them on and off.
create table btw_languages (
  code        text primary key,               -- ISO 639-1, same codes Google Translate uses
  name        text not null,                  -- native name, e.g. Español
  menu_label  text not null,                  -- GSM-7-safe label for the SMS menu, e.g. Espanol
  menu_order  int  not null,
  active      boolean not null default false,
  updated_at  timestamptz not null default now()
);

-- One row per piece of editable copy, whatever the language.
create table btw_prompt_keys (
  key           text primary key,
  section       text not null check (section in ('system', 'fields', 'summary', 'keywords')),
  description   text not null,                -- shown in the editor
  placeholders  text[] not null default '{}', -- tokens the text must keep, without braces: {name} -> 'name'
  sort_order    int not null
);

-- The copy itself, per language. English is the source the others are
-- translated from.
create table btw_prompts (
  key         text not null references btw_prompt_keys (key) on update cascade on delete cascade,
  lang        text not null references btw_languages (code) on update cascade on delete cascade,
  text        text not null,
  updated_at  timestamptz not null default now(),
  primary key (key, lang)
);

-- One signup per phone number.
create table btw_churches (
  id              uuid primary key default gen_random_uuid(),
  phone           text not null unique,       -- E.164, the number that texted in
  lang            text references btw_languages (code),
  status          text not null default 'in_progress'
                  check (status in ('in_progress', 'complete', 'opted_out')),
  name            text,
  email           text,
  church_name     text,
  street          text,
  city            text,
  state           text,
  zip             text,
  denomination    text,
  website         text,
  contact_name    text,                       -- null means the texter is the main contact
  contact_phone   text,
  baptism_same    boolean,                    -- true: baptisms at the church address
  baptism_street  text,
  baptism_city    text,
  baptism_state   text,
  baptism_zip     text,
  public_map      boolean,
  consent_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Where each phone number is in the conversation.
create table btw_sessions (
  phone       text primary key,
  lang        text references btw_languages (code),
  phase       text not null default 'lang'
              check (phase in ('lang', 'collect', 'summary', 'done', 'stopped')),
  queue       text[] not null default '{}',  -- pending step keys; the first is the open question
  editing     boolean not null default false,
  updated_at  timestamptz not null default now()
);

-- Every message in and out. provider_id is the voip.ms id of an inbound
-- message; it is unique so a callback voip.ms retries is handled once.
create table btw_messages (
  id           bigint generated always as identity primary key,
  provider_id  text unique,
  phone        text not null,
  direction    text not null check (direction in ('in', 'out')),
  body         text not null,
  created_at   timestamptz not null default now()
);
create index btw_messages_phone_created_idx on btw_messages (phone, created_at);

create trigger btw_languages_updated_at before update on btw_languages for each row execute function btw_set_updated_at();
create trigger btw_prompts_updated_at   before update on btw_prompts   for each row execute function btw_set_updated_at();
create trigger btw_churches_updated_at  before update on btw_churches  for each row execute function btw_set_updated_at();
create trigger btw_sessions_updated_at  before update on btw_sessions  for each row execute function btw_set_updated_at();

alter table btw_languages   enable row level security;
alter table btw_prompt_keys enable row level security;
alter table btw_prompts     enable row level security;
alter table btw_churches    enable row level security;
alter table btw_sessions    enable row level security;
alter table btw_messages    enable row level security;
