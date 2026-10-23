-- Language detection: a first text written clearly in a switched-on
-- language starts the signup in it, skipping the menu. lang_detected is
-- sent first and says how to get the menu (MENU, which works in every
-- language). Translations are written by hand; review them in /admin.

insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('lang_detected', 'system', 'Sent first when the language was guessed from the first text, before the welcome. Says how to pick another language.', '{}', 35),
  ('kw_menu', 'keywords', 'Command to bring back the language menu. MENU itself always works.', '{}', 509)
on conflict (key) do nothing;

insert into btw_prompts (key, lang, text) values
  ('lang_detected', 'en', 'We''ll text you in English. Reply MENU anytime to choose another language.'),
  ('lang_detected', 'es', 'Le escribiremos en español. Responda MENU en cualquier momento para elegir otro idioma.'),
  ('lang_detected', 'fr', 'Nous vous écrirons en français. Répondez MENU à tout moment pour choisir une autre langue.'),
  ('lang_detected', 'pt', 'Vamos escrever em português. Responda MENU a qualquer momento para escolher outro idioma.'),
  ('lang_detected', 'zh', '我们将用中文给您发短信。随时回复 MENU 可选择其他语言。'),
  ('lang_detected', 'ar', 'سنراسلك باللغة العربية. أرسل MENU في أي وقت لاختيار لغة أخرى.'),
  ('lang_detected', 'hi', 'हम आपको हिंदी में संदेश भेजेंगे। दूसरी भाषा चुनने के लिए कभी भी MENU लिखकर भेजें।'),
  ('lang_detected', 'ru', 'Мы будем писать вам на русском. Ответьте MENU в любой момент, чтобы выбрать другой язык.'),
  ('lang_detected', 'bn', 'আমরা আপনাকে বাংলায় বার্তা পাঠাব। অন্য ভাষা বেছে নিতে যেকোনো সময় MENU লিখে পাঠান।'),
  ('lang_detected', 'ur', 'ہم آپ کو اردو میں پیغام بھیجیں گے۔ دوسری زبان منتخب کرنے کے لیے کسی بھی وقت MENU بھیجیں۔'),
  ('kw_menu', 'en', 'MENU'),
  ('kw_menu', 'es', 'MENU,MENÚ,IDIOMA'),
  ('kw_menu', 'fr', 'MENU,LANGUE'),
  ('kw_menu', 'pt', 'MENU,IDIOMA'),
  ('kw_menu', 'zh', 'MENU,菜单,语言'),
  ('kw_menu', 'ar', 'MENU,قائمة,اللغة'),
  ('kw_menu', 'hi', 'MENU,मेनू,भाषा'),
  ('kw_menu', 'ru', 'MENU,МЕНЮ,ЯЗЫК'),
  ('kw_menu', 'bn', 'MENU,মেনু,ভাষা'),
  ('kw_menu', 'ur', 'MENU,مینو,زبان')
on conflict (key, lang) do nothing;
