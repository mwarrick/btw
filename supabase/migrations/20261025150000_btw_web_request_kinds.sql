-- btw_web_requests.kind had a check that only knew the kinds from before
-- 2026-10-25, so recording a 30-days link text ('journey_link') or a parent's
-- approval link text ('guardian') failed with a 500 ("Something went wrong").
alter table btw_web_requests drop constraint if exists btw_web_requests_kind_check;
alter table btw_web_requests add constraint btw_web_requests_kind_check
  check (kind = any (array['code', 'link', 'welcome', 'bot', 'story', 'journey', 'journey_link', 'guardian']));
