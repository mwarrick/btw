-- Text alerts to the team: a team member's US/Canadian mobile number
-- (Users in /admin) gets a text when a pastor writes to the team, one per
-- conversation until someone reads it (lib/team-alerts.js).
alter table btw_users add column if not exists alert_phone text;
