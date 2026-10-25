-- The first 30 days: the phone is how people get their link (and get it
-- back, by entering the same number again), so it's always asked. Letting
-- their church contact them, and letting their church and the team see their
-- progress, are optional.
insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('j_link_resent', 'system', '30 days start page: that phone already started; its link was texted to it again.', '{}', 871)
on conflict (key) do nothing;
insert into btw_prompts (key, lang, text) values
  ('j_link_resent', 'en', 'You''ve already started. We texted your link to that number.'),
  ('j_link_resent', 'es', 'Usted ya empezó. Enviamos su enlace a ese número.'),
  ('j_link_resent', 'fr', 'Vous avez déjà commencé. Nous avons envoyé votre lien à ce numéro.'),
  ('j_link_resent', 'pt', 'Você já começou. Enviamos seu link para esse número.'),
  ('j_link_resent', 'zh', '您已经开始了。我们已把您的链接发送到该号码。'),
  ('j_link_resent', 'ar', 'لقد بدأت بالفعل. أرسلنا رابطك إلى ذلك الرقم.'),
  ('j_link_resent', 'hi', 'आप पहले ही शुरू कर चुके हैं। हमने आपका लिंक उस नंबर पर भेज दिया है।'),
  ('j_link_resent', 'bn', 'আপনি আগেই শুরু করেছেন। আমরা আপনার লিংক সেই নম্বরে পাঠিয়েছি।'),
  ('j_link_resent', 'ru', 'Вы уже начали. Мы отправили вашу ссылку на этот номер.'),
  ('j_link_resent', 'ur', 'آپ پہلے ہی شروع کر چکے ہیں۔ ہم نے آپ کا لنک اس نمبر پر بھیج دیا ہے۔')
on conflict (key, lang) do nothing;
update btw_prompts set text = 'We''ll text you your link. To get it again, enter this number here.', updated_at = now() where key = 'j_phone_hint' and lang = 'en';
update btw_prompts set text = 'Le enviaremos su enlace por mensaje. Para recibirlo otra vez, escriba este número aquí.', updated_at = now() where key = 'j_phone_hint' and lang = 'es';
update btw_prompts set text = 'Nous vous enverrons votre lien par SMS. Pour le recevoir à nouveau, entrez ce numéro ici.', updated_at = now() where key = 'j_phone_hint' and lang = 'fr';
update btw_prompts set text = 'Enviaremos seu link por mensagem. Para recebê-lo de novo, digite este número aqui.', updated_at = now() where key = 'j_phone_hint' and lang = 'pt';
update btw_prompts set text = '我们会用短信把您的链接发给您。如需再次获取，请在这里输入此号码。', updated_at = now() where key = 'j_phone_hint' and lang = 'zh';
update btw_prompts set text = 'سنرسل لك رابطك برسالة. لتحصل عليه مرة أخرى، أدخل هذا الرقم هنا.', updated_at = now() where key = 'j_phone_hint' and lang = 'ar';
update btw_prompts set text = 'हम आपको आपका लिंक मैसेज करेंगे। इसे फिर से पाने के लिए, यहाँ यही नंबर लिखें।', updated_at = now() where key = 'j_phone_hint' and lang = 'hi';
update btw_prompts set text = 'আমরা আপনাকে আপনার লিংক মেসেজ করব। আবার পেতে, এখানে এই নম্বরটি লিখুন।', updated_at = now() where key = 'j_phone_hint' and lang = 'bn';
update btw_prompts set text = 'Мы пришлём вам ссылку в сообщении. Чтобы получить её снова, введите здесь этот номер.', updated_at = now() where key = 'j_phone_hint' and lang = 'ru';
update btw_prompts set text = 'ہم آپ کو آپ کا لنک میسج کریں گے۔ اسے دوبارہ حاصل کرنے کے لیے، یہاں یہی نمبر لکھیں۔', updated_at = now() where key = 'j_phone_hint' and lang = 'ur';
update btw_prompts set text = 'My church may contact me at this number', updated_at = now() where key = 'j_contact' and lang = 'en';
update btw_prompts set text = 'Mi iglesia puede comunicarse conmigo a este número', updated_at = now() where key = 'j_contact' and lang = 'es';
update btw_prompts set text = 'Mon église peut me contacter à ce numéro', updated_at = now() where key = 'j_contact' and lang = 'fr';
update btw_prompts set text = 'Minha igreja pode entrar em contato comigo neste número', updated_at = now() where key = 'j_contact' and lang = 'pt';
update btw_prompts set text = '我的教会可以用这个号码联系我', updated_at = now() where key = 'j_contact' and lang = 'zh';
update btw_prompts set text = 'يمكن لكنيستي التواصل معي على هذا الرقم', updated_at = now() where key = 'j_contact' and lang = 'ar';
update btw_prompts set text = 'मेरा चर्च इस नंबर पर मुझसे संपर्क कर सकता है', updated_at = now() where key = 'j_contact' and lang = 'hi';
update btw_prompts set text = 'আমার চার্চ এই নম্বরে আমার সাথে যোগাযোগ করতে পারে', updated_at = now() where key = 'j_contact' and lang = 'bn';
update btw_prompts set text = 'Моя церковь может связаться со мной по этому номеру', updated_at = now() where key = 'j_contact' and lang = 'ru';
update btw_prompts set text = 'میرا چرچ اس نمبر پر مجھ سے رابطہ کر سکتا ہے', updated_at = now() where key = 'j_contact' and lang = 'ur';
