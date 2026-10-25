-- The first 30 days: someone who gives their phone is texted their private
-- link once when they start (j_link_text; no reminders are texted). The phone
-- box only shows once "My church may contact me" is ticked, and then a number
-- is needed, so its hint no longer says "Optional" and says the link is texted.
insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('j_link_text', 'system', 'Text with the 30-days link, sent once when someone starts with their phone. Keep {link}.', '{link}', 870)
on conflict (key) do nothing;
insert into btw_prompts (key, lang, text) values
  ('j_link_text', 'en', 'Your first 30 days with Jesus: {link} Open it each day.'),
  ('j_link_text', 'es', 'Sus primeros 30 días con Jesús: {link} Ábralo cada día.'),
  ('j_link_text', 'fr', 'Vos 30 premiers jours avec Jésus : {link} Ouvrez-le chaque jour.'),
  ('j_link_text', 'pt', 'Seus primeiros 30 dias com Jesus: {link} Abra todos os dias.'),
  ('j_link_text', 'zh', '您跟随耶稣的头30天：{link} 每天打开一次。'),
  ('j_link_text', 'ar', 'أيامك الثلاثون الأولى مع يسوع: {link} افتحه كل يوم.'),
  ('j_link_text', 'hi', 'यीशु के साथ आपके पहले 30 दिन: {link} इसे हर दिन खोलें।'),
  ('j_link_text', 'bn', 'যীশুর সাথে আপনার প্রথম 30 দিন: {link} প্রতিদিন এটি খুলুন।'),
  ('j_link_text', 'ru', 'Ваши первые 30 дней с Иисусом: {link} Открывайте каждый день.'),
  ('j_link_text', 'ur', 'یسوع کے ساتھ آپ کے پہلے 30 دن: {link} اسے ہر روز کھولیں۔')
on conflict (key, lang) do nothing;
update btw_prompts set text = 'We''ll text you the link to your 30 days. Only your church will see your number.', updated_at = now() where key = 'j_phone_hint' and lang = 'en';
update btw_prompts set text = 'Le enviaremos por mensaje el enlace a sus 30 días. Solo su iglesia verá su número.', updated_at = now() where key = 'j_phone_hint' and lang = 'es';
update btw_prompts set text = 'Nous vous enverrons par SMS le lien vers vos 30 jours. Seule votre église verra votre numéro.', updated_at = now() where key = 'j_phone_hint' and lang = 'fr';
update btw_prompts set text = 'Enviaremos por mensagem o link dos seus 30 dias. Só sua igreja verá seu número.', updated_at = now() where key = 'j_phone_hint' and lang = 'pt';
update btw_prompts set text = '我们会用短信把您30天的链接发给您。只有您的教会能看到您的号码。', updated_at = now() where key = 'j_phone_hint' and lang = 'zh';
update btw_prompts set text = 'سنرسل لك رابط أيامك الثلاثين برسالة. لن يرى رقمك إلا كنيستك.', updated_at = now() where key = 'j_phone_hint' and lang = 'ar';
update btw_prompts set text = 'हम आपको आपके 30 दिनों का लिंक मैसेज करेंगे। आपका नंबर केवल आपका चर्च देखेगा।', updated_at = now() where key = 'j_phone_hint' and lang = 'hi';
update btw_prompts set text = 'আমরা আপনাকে আপনার 30 দিনের লিংক মেসেজ করব। আপনার নম্বর শুধু আপনার চার্চ দেখবে।', updated_at = now() where key = 'j_phone_hint' and lang = 'bn';
update btw_prompts set text = 'Мы пришлём вам ссылку на ваши 30 дней. Ваш номер увидит только ваша церковь.', updated_at = now() where key = 'j_phone_hint' and lang = 'ru';
update btw_prompts set text = 'ہم آپ کو آپ کے 30 دنوں کا لنک میسج کریں گے۔ آپ کا نمبر صرف آپ کا چرچ دیکھے گا۔', updated_at = now() where key = 'j_phone_hint' and lang = 'ur';
