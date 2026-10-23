-- Problems worth seeing in /admin: replies voip.ms refused, errors running
-- the conversation, callbacks with the wrong key. Written by lib/events.js.
create table btw_events (
  id          bigint generated always as identity primary key,
  level       text not null check (level in ('error', 'warning', 'info')),
  source      text not null,                 -- what logged it, e.g. sms-inbound
  phone       text,                          -- +1XXXXXXXXXX when it concerns one number
  message     text not null,                 -- in words, shown in the log
  detail      jsonb,                         -- e.g. voip.ms's status code
  created_at  timestamptz not null default now()
);
create index btw_events_created_idx on btw_events (created_at desc);
alter table btw_events enable row level security;

-- Why an outgoing text didn't go out; null when it was sent.
alter table btw_messages add column error text;
