-- Baptism stories: the writing page (/s/<key>) shows, read-only, the phone
-- number the private link was texted to, with how to get the link again.
insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('story_phone_note', 'system', 'Testimony page: under the phone number shown read-only.', '{}', 873)
on conflict (key) do nothing;
insert into btw_prompts (key, lang, text) values
  ('story_phone_note', 'en', 'Your private link was texted to this number. Enter it again on the start page to get the link back.'),
  ('story_phone_note', 'es', 'Su enlace privado se envió a este número. Escríbalo otra vez en la página de inicio para recibir el enlace de nuevo.'),
  ('story_phone_note', 'fr', 'Votre lien privé a été envoyé à ce numéro. Entrez-le à nouveau sur la page de départ pour recevoir le lien encore une fois.'),
  ('story_phone_note', 'pt', 'Seu link particular foi enviado para este número. Digite-o de novo na página inicial para receber o link outra vez.'),
  ('story_phone_note', 'zh', '您的专属链接已发送到这个号码。在开始页面再次输入此号码即可重新获取链接。'),
  ('story_phone_note', 'ar', 'أُرسل رابطك الخاص إلى هذا الرقم. أدخله مرة أخرى في صفحة البداية لتحصل على الرابط من جديد.'),
  ('story_phone_note', 'hi', 'आपका निजी लिंक इसी नंबर पर भेजा गया था। लिंक फिर से पाने के लिए शुरुआती पेज पर यही नंबर दोबारा लिखें।'),
  ('story_phone_note', 'bn', 'আপনার ব্যক্তিগত লিংক এই নম্বরে পাঠানো হয়েছে। আবার লিংক পেতে শুরুর পেজে এই নম্বরটি আবার লিখুন।'),
  ('story_phone_note', 'ru', 'Ваша личная ссылка отправлена на этот номер. Введите его снова на начальной странице, чтобы получить ссылку ещё раз.'),
  ('story_phone_note', 'ur', 'آپ کا نجی لنک اسی نمبر پر بھیجا گیا تھا۔ لنک دوبارہ پانے کے لیے شروع والے صفحے پر یہی نمبر دوبارہ لکھیں۔')
on conflict (key, lang) do nothing;
