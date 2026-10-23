-- People who use /admin. Everyone has the same rights, including adding
-- and removing each other. Removing someone keeps their row (active =
-- false) so the messages they sent still show their name.
create table btw_users (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,          -- lower case; the login name
  name           text not null,                 -- shown on messages they send
  password_hash  text not null,                 -- scrypt$<salt>$<hash>, see lib/admin-auth.js
  session_version int not null default 1,       -- bumped on password change or removal: signs them out everywhere
  active         boolean not null default true,
  last_login_at  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger btw_users_updated_at before update on btw_users for each row execute function btw_set_updated_at();
alter table btw_users enable row level security;

-- Who sent a team message from /admin.
alter table btw_messages add column sent_by uuid references btw_users (id);
