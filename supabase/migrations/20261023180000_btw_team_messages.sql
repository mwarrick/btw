-- Reviewers texting pastors from /admin. Their texts, and the pastor's
-- replies once the signup is finished, are kept apart from the signup
-- conversation by `thread`.
alter table btw_messages
  add column thread text not null default 'signup' check (thread in ('signup', 'team')),
  add column read_at timestamptz,      -- incoming team texts: when a reviewer opened them; null is unread
  add column translation text;         -- incoming team texts not in English: Google's English version

create index btw_messages_unread_idx on btw_messages (phone) where thread = 'team' and direction = 'in' and read_at is null;
