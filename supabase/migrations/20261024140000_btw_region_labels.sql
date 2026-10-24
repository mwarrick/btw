-- The signup form and the church's page say "State / province / region" and
-- "Postal code" instead of State and ZIP when the country isn't the US
-- (the checks already took any region and postal code there).
insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('web_region', 'system', 'Web pages: label for the state box when the church isn''t in the US.', '{}', 290),
  ('web_postal', 'system', 'Web pages: label for the ZIP box when the church isn''t in the US.', '{}', 291)
on conflict (key) do nothing;

insert into btw_prompts (key, lang, text) values
  ('web_region', 'en', 'State / province / region'),
  ('web_region', 'es', 'Estado / provincia / región'),
  ('web_region', 'fr', 'État / province / région'),
  ('web_region', 'pt', 'Estado / província / região'),
  ('web_region', 'zh', '州 / 省 / 地区'),
  ('web_region', 'ar', 'الولاية / المقاطعة / المنطقة'),
  ('web_region', 'hi', 'राज्य / प्रांत / क्षेत्र'),
  ('web_region', 'bn', 'রাজ্য / প্রদেশ / অঞ্চল'),
  ('web_region', 'ru', 'Штат / провинция / регион'),
  ('web_region', 'ur', 'ریاست / صوبہ / علاقہ'),
  ('web_postal', 'en', 'Postal code'),
  ('web_postal', 'es', 'Código postal'),
  ('web_postal', 'fr', 'Code postal'),
  ('web_postal', 'pt', 'Código postal'),
  ('web_postal', 'zh', '邮政编码'),
  ('web_postal', 'ar', 'الرمز البريدي'),
  ('web_postal', 'hi', 'पोस्टल कोड'),
  ('web_postal', 'bn', 'পোস্টাল কোড'),
  ('web_postal', 'ru', 'Почтовый индекс'),
  ('web_postal', 'ur', 'پوسٹل کوڈ')
on conflict (key, lang) do nothing;
