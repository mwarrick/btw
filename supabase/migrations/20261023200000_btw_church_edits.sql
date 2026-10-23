-- Who last changed a signup's answers from /admin, and when.
alter table btw_churches
  add column edited_by uuid references btw_users (id),
  add column edited_at timestamptz;
