-- Baptism stories: the phone hint and the texted link now say the link is
-- for writing, checking on, changing or deleting the story, and the writer
-- is texted the link once more when they first save (story_saved_text,
-- btw_testimonies.saved_texted_at; kind 'story_saved' in btw_web_requests).
alter table btw_testimonies add column if not exists saved_texted_at timestamptz;
alter table btw_web_requests drop constraint if exists btw_web_requests_kind_check;
alter table btw_web_requests add constraint btw_web_requests_kind_check
  check (kind = any (array['code', 'link', 'welcome', 'bot', 'story', 'journey', 'journey_link', 'guardian', 'story_saved']));

insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('story_saved_text', 'system', 'Text to a story writer the first time they save: their link again. Keep {link}.', '{link}', 872)
on conflict (key) do nothing;
insert into btw_prompts (key, lang, text) values
  ('story_saved_text', 'en', 'Your story is saved. See, change or delete it anytime: {link}'),
  ('story_saved_text', 'es', 'Su historia está guardada. Véala, cámbiela o bórrela cuando quiera: {link}'),
  ('story_saved_text', 'fr', 'Votre histoire est enregistrée. Voyez-la, modifiez-la ou supprimez-la à tout moment : {link}'),
  ('story_saved_text', 'pt', 'Sua história foi salva. Veja, mude ou apague quando quiser: {link}'),
  ('story_saved_text', 'zh', '您的故事已保存。随时查看、修改或删除：{link}'),
  ('story_saved_text', 'ar', 'تم حفظ قصتك. اعرضها أو عدّلها أو احذفها في أي وقت: {link}'),
  ('story_saved_text', 'hi', 'आपकी कहानी सेव हो गई है। इसे कभी भी देखें, बदलें या हटाएँ: {link}'),
  ('story_saved_text', 'bn', 'আপনার গল্প সেভ হয়েছে। যেকোনো সময় দেখুন, বদলান বা মুছে ফেলুন: {link}'),
  ('story_saved_text', 'ru', 'Ваша история сохранена. Смотрите, меняйте или удаляйте её в любое время: {link}'),
  ('story_saved_text', 'ur', 'آپ کی کہانی محفوظ ہو گئی ہے۔ اسے کبھی بھی دیکھیں، بدلیں یا مٹائیں: {link}')
on conflict (key, lang) do nothing;
update btw_prompts set text = 'With + and your country code outside the US and Canada. We''ll text you a private link to write, check on, change or delete your story.', updated_at = now() where key = 'story_phone_hint' and lang = 'en';
update btw_prompts set text = 'Con + y el código de su país fuera de EE. UU. y Canadá. Le enviaremos un enlace privado para escribir, revisar, cambiar o borrar su historia.', updated_at = now() where key = 'story_phone_hint' and lang = 'es';
update btw_prompts set text = 'Avec + et l''indicatif du pays hors États-Unis et Canada. Nous vous enverrons un lien privé pour écrire, revoir, modifier ou supprimer votre histoire.', updated_at = now() where key = 'story_phone_hint' and lang = 'fr';
update btw_prompts set text = 'Com + e o código do país fora dos EUA e Canadá. Enviaremos um link particular para escrever, ver, mudar ou apagar sua história.', updated_at = now() where key = 'story_phone_hint' and lang = 'pt';
update btw_prompts set text = '美国和加拿大以外请加 + 和国家代码。我们会用短信发给您一个专属链接，用来撰写、查看、修改或删除您的故事。', updated_at = now() where key = 'story_phone_hint' and lang = 'zh';
update btw_prompts set text = 'مع + ورمز بلدك خارج الولايات المتحدة وكندا. سنرسل لك رابطًا خاصًا لكتابة قصتك أو مراجعتها أو تعديلها أو حذفها.', updated_at = now() where key = 'story_phone_hint' and lang = 'ar';
update btw_prompts set text = 'अमेरिका और कनाडा के बाहर + और देश के कोड के साथ। हम आपको अपनी कहानी लिखने, देखने, बदलने या हटाने के लिए एक निजी लिंक मैसेज करेंगे।', updated_at = now() where key = 'story_phone_hint' and lang = 'hi';
update btw_prompts set text = 'যুক্তরাষ্ট্র ও কানাডার বাইরে + ও দেশের কোডসহ। আপনার গল্প লেখা, দেখা, বদলানো বা মুছে ফেলার জন্য আমরা একটি ব্যক্তিগত লিংক পাঠাব।', updated_at = now() where key = 'story_phone_hint' and lang = 'bn';
update btw_prompts set text = 'За пределами США и Канады — с + и кодом страны. Мы пришлём личную ссылку, чтобы написать, проверить, изменить или удалить вашу историю.', updated_at = now() where key = 'story_phone_hint' and lang = 'ru';
update btw_prompts set text = 'امریکہ اور کینیڈا سے باہر + اور ملک کے کوڈ کے ساتھ۔ ہم آپ کو اپنی کہانی لکھنے، دیکھنے، بدلنے یا مٹانے کے لیے ایک نجی لنک بھیجیں گے۔', updated_at = now() where key = 'story_phone_hint' and lang = 'ur';
update btw_prompts set text = 'Your baptism story: {link} Use this link anytime to see, change or delete it.', updated_at = now() where key = 'story_link_text' and lang = 'en';
update btw_prompts set text = 'Su historia de bautismo: {link} Use este enlace cuando quiera para verla, cambiarla o borrarla.', updated_at = now() where key = 'story_link_text' and lang = 'es';
update btw_prompts set text = 'Votre histoire de baptême : {link} Utilisez ce lien à tout moment pour la voir, la modifier ou la supprimer.', updated_at = now() where key = 'story_link_text' and lang = 'fr';
update btw_prompts set text = 'Sua história de batismo: {link} Use este link quando quiser para ver, mudar ou apagar.', updated_at = now() where key = 'story_link_text' and lang = 'pt';
update btw_prompts set text = '您的受洗故事：{link} 随时可用这个链接查看、修改或删除。', updated_at = now() where key = 'story_link_text' and lang = 'zh';
update btw_prompts set text = 'قصة معموديتك: {link} استخدم هذا الرابط في أي وقت لعرضها أو تعديلها أو حذفها.', updated_at = now() where key = 'story_link_text' and lang = 'ar';
update btw_prompts set text = 'आपकी बपतिस्मा की कहानी: {link} इसे देखने, बदलने या हटाने के लिए यह लिंक कभी भी इस्तेमाल करें।', updated_at = now() where key = 'story_link_text' and lang = 'hi';
update btw_prompts set text = 'আপনার বাপ্তিস্মের গল্প: {link} দেখতে, বদলাতে বা মুছে ফেলতে যেকোনো সময় এই লিংক ব্যবহার করুন।', updated_at = now() where key = 'story_link_text' and lang = 'bn';
update btw_prompts set text = 'Ваша история крещения: {link} По этой ссылке её можно в любое время посмотреть, изменить или удалить.', updated_at = now() where key = 'story_link_text' and lang = 'ru';
update btw_prompts set text = 'آپ کی بپتسمہ کی کہانی: {link} اسے دیکھنے، بدلنے یا مٹانے کے لیے یہ لنک کبھی بھی استعمال کریں۔', updated_at = now() where key = 'story_link_text' and lang = 'ur';
