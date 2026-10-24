-- Send login link in /admin texts its own wording (login_link) instead of
-- the thank-you's done_link: what the page is for now (photos, profile,
-- baptism counts). Translations by hand.
insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('login_link', 'system', 'Texted by Send login link in /admin: what their page is for, with the link. Keep {link}.', '{link}', 37)
on conflict (key) do nothing;

insert into btw_prompts (key, lang, text) values
  ('login_link', 'en', 'Upload photos, change your profile, record baptism counts here: {link}'),
  ('login_link', 'es', 'Suba fotos, cambie su perfil y registre los bautismos aquí: {link}'),
  ('login_link', 'fr', 'Ajoutez des photos, modifiez votre profil et indiquez vos baptêmes ici : {link}'),
  ('login_link', 'pt', 'Envie fotos, altere seu perfil e registre os batismos aqui: {link}'),
  ('login_link', 'zh', '在这里上传照片、修改资料、记录受洗人数：{link}'),
  ('login_link', 'ar', 'ارفع الصور، وعدّل ملفك، وسجّل عدد المعموديات هنا: {link}'),
  ('login_link', 'hi', 'यहाँ फ़ोटो अपलोड करें, अपनी प्रोफ़ाइल बदलें और बपतिस्मा की संख्या दर्ज करें: {link}'),
  ('login_link', 'bn', 'এখানে ছবি আপলোড করুন, প্রোফাইল বদলান ও বাপ্তিস্মের সংখ্যা লিখুন: {link}'),
  ('login_link', 'ru', 'Загружайте фото, меняйте профиль и отмечайте число крещений здесь: {link}'),
  ('login_link', 'ur', 'یہاں تصاویر اپلوڈ کریں، اپنا پروفائل بدلیں اور بپتسمہ کی تعداد درج کریں: {link}')
on conflict (key, lang) do nothing;
