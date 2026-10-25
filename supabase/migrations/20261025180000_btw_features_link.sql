-- The "How it works" page (/features) in every language: the front page's
-- link to it (land_how_link). The page's own text is machine-translated on
-- first view per language and kept in btw_guides (key 'features').
insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('land_how_link', 'system', 'Front page: link to the How it works page, under the cards.', '{}', 874)
on conflict (key) do nothing;
insert into btw_prompts (key, lang, text) values
  ('land_how_link', 'en', 'How Baptize 2027 works'),
  ('land_how_link', 'es', 'Cómo funciona Baptize 2027'),
  ('land_how_link', 'fr', 'Comment fonctionne Baptize 2027'),
  ('land_how_link', 'pt', 'Como funciona o Baptize 2027'),
  ('land_how_link', 'zh', 'Baptize 2027 如何运作'),
  ('land_how_link', 'ar', 'كيف يعمل Baptize 2027'),
  ('land_how_link', 'hi', 'Baptize 2027 कैसे काम करता है'),
  ('land_how_link', 'bn', 'Baptize 2027 কীভাবে কাজ করে'),
  ('land_how_link', 'ru', 'Как работает Baptize 2027'),
  ('land_how_link', 'ur', 'Baptize 2027 کیسے کام کرتا ہے')
on conflict (key, lang) do nothing;
