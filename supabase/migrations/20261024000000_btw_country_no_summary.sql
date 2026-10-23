-- Churches outside the US: a country question after the church's name
-- (YES means the US), and outside the US a state/province/region and a
-- postal code that are free-form (SKIP allowed) instead of a US state and a
-- 5-digit ZIP. Signups from before have no country and count as US.
--
-- Also: the numbered summary is no longer sent. The last answer finishes the
-- signup and the reply is the thank-you with the pastor's page link, so
-- done, done_reply and help no longer talk about EDIT and the summary.
-- And some machine-translated labels were wrong (ZIP as "zipper", State as
-- "status"). All translations here are by hand.
alter table btw_churches add column country text;
update btw_churches set country = 'US' where country is null and state is not null;

insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('ask_country', 'fields', 'Question: is the church in the US (YES), or which country.', '{}', 225),
  ('edit_country', 'fields', 'Edit question: country.', '{}', 226),
  ('err_country', 'fields', 'Invalid answer: no country (e.g. just NO).', '{}', 227),
  ('ask_region', 'fields', 'Question outside the US: state, province or region (church or baptism site; SKIP allowed).', '{}', 255),
  ('ask_postal', 'fields', 'Question outside the US: postal code (church or baptism site; SKIP allowed).', '{}', 265),
  ('err_postal', 'fields', 'Invalid answer outside the US: postal code isn''t letters/digits/spaces/dashes, up to 10.', '{}', 266),
  ('sum_country', 'summary', 'Label: country (EDIT 13).', '{}', 413)
on conflict (key) do nothing;

insert into btw_prompts (key, lang, text) values
  ('ask_country', 'en', 'Is your church in the US? Reply YES, or send the name of your country.'),
  ('ask_country', 'es', '¿Su iglesia está en EE. UU.? Responda SÍ, o envíe el nombre de su país.'),
  ('ask_country', 'fr', 'Votre église est-elle aux États-Unis ? Répondez OUI, ou envoyez le nom de votre pays.'),
  ('ask_country', 'pt', 'Sua igreja fica nos EUA? Responda SIM, ou envie o nome do seu país.'),
  ('ask_country', 'zh', '您的教会在美国吗？请回复“是的”，或发送您所在国家的名称。'),
  ('ask_country', 'ar', 'هل كنيستك في الولايات المتحدة؟ أجب بـ "نعم"، أو أرسل اسم بلدك.'),
  ('ask_country', 'hi', 'क्या आपका चर्च अमेरिका में है? YES लिखकर जवाब दें, या अपने देश का नाम भेजें।'),
  ('ask_country', 'bn', 'আপনার চার্চ কি যুক্তরাষ্ট্রে? উত্তরে হ্যাঁ লিখুন, অথবা আপনার দেশের নাম পাঠান।'),
  ('ask_country', 'ru', 'Ваша церковь находится в США? Ответьте ДА или пришлите название вашей страны.'),
  ('ask_country', 'ur', 'کیا آپ کا چرچ امریکہ میں ہے؟ ہاں لکھ کر جواب دیں، یا اپنے ملک کا نام بھیجیں۔'),
  ('edit_country', 'en', 'Which country? Reply YES for the US, or send the country''s name.'),
  ('edit_country', 'es', '¿Qué país? Responda SÍ si es EE. UU., o envíe el nombre del país.'),
  ('edit_country', 'fr', 'Quel pays ? Répondez OUI pour les États-Unis, ou envoyez le nom du pays.'),
  ('edit_country', 'pt', 'Qual país? Responda SIM para os EUA, ou envie o nome do país.'),
  ('edit_country', 'zh', '哪个国家？如在美国请回复“是的”，否则请发送国家名称。'),
  ('edit_country', 'ar', 'أي دولة؟ أجب بـ "نعم" إذا كانت الولايات المتحدة، أو أرسل اسم الدولة.'),
  ('edit_country', 'hi', 'कौन सा देश? अमेरिका के लिए YES लिखें, या देश का नाम भेजें।'),
  ('edit_country', 'bn', 'কোন দেশ? যুক্তরাষ্ট্র হলে হ্যাঁ লিখুন, অথবা দেশের নাম পাঠান।'),
  ('edit_country', 'ru', 'Какая страна? Ответьте ДА, если это США, или пришлите название страны.'),
  ('edit_country', 'ur', 'کون سا ملک؟ امریکہ کے لیے ہاں لکھیں، یا ملک کا نام بھیجیں۔'),
  ('err_country', 'en', 'Please send the name of the country your church is in.'),
  ('err_country', 'es', 'Envíe el nombre del país donde está su iglesia.'),
  ('err_country', 'fr', 'Envoyez le nom du pays où se trouve votre église.'),
  ('err_country', 'pt', 'Envie o nome do país onde fica sua igreja.'),
  ('err_country', 'zh', '请发送您教会所在国家的名称。'),
  ('err_country', 'ar', 'أرسل اسم الدولة التي توجد فيها كنيستك.'),
  ('err_country', 'hi', 'कृपया उस देश का नाम भेजें जहाँ आपका चर्च है।'),
  ('err_country', 'bn', 'আপনার চার্চ যে দেশে, সেই দেশের নাম পাঠান।'),
  ('err_country', 'ru', 'Пришлите название страны, где находится ваша церковь.'),
  ('err_country', 'ur', 'براہ کرم اس ملک کا نام بھیجیں جہاں آپ کا چرچ ہے۔'),
  ('sum_country', 'en', 'Country'),
  ('sum_country', 'es', 'País'),
  ('sum_country', 'fr', 'Pays'),
  ('sum_country', 'pt', 'País'),
  ('sum_country', 'zh', '国家'),
  ('sum_country', 'ar', 'الدولة'),
  ('sum_country', 'hi', 'देश'),
  ('sum_country', 'bn', 'দেশ'),
  ('sum_country', 'ru', 'Страна'),
  ('sum_country', 'ur', 'ملک'),
  ('ask_region', 'en', 'State, province or region? (or reply SKIP)'),
  ('ask_region', 'es', '¿Estado, provincia o región? (o responda SALTAR)'),
  ('ask_region', 'fr', 'État, province ou région ? (ou répondez SAUTER)'),
  ('ask_region', 'pt', 'Estado, província ou região? (ou responda PULAR)'),
  ('ask_region', 'zh', '州、省或地区？（或回复“跳过”）'),
  ('ask_region', 'ar', 'الولاية أو المقاطعة أو المنطقة؟ (أو أجب بـ SKIP)'),
  ('ask_region', 'hi', 'राज्य, प्रांत या क्षेत्र? (या SKIP लिखकर जवाब दें)'),
  ('ask_region', 'bn', 'রাজ্য, প্রদেশ বা অঞ্চল? (অথবা উত্তরে SKIP লিখুন)'),
  ('ask_region', 'ru', 'Штат, провинция или регион? (или ответьте SKIP)'),
  ('ask_region', 'ur', 'ریاست، صوبہ یا علاقہ؟ (یا SKIP کا جواب دیں)'),
  ('ask_postal', 'en', 'Postal code? (or reply SKIP)'),
  ('ask_postal', 'es', '¿Código postal? (o responda SALTAR)'),
  ('ask_postal', 'fr', 'Code postal ? (ou répondez SAUTER)'),
  ('ask_postal', 'pt', 'Código postal? (ou responda PULAR)'),
  ('ask_postal', 'zh', '邮政编码？（或回复“跳过”）'),
  ('ask_postal', 'ar', 'الرمز البريدي؟ (أو أجب بـ SKIP)'),
  ('ask_postal', 'hi', 'पोस्टल कोड? (या SKIP लिखकर जवाब दें)'),
  ('ask_postal', 'bn', 'পোস্টাল কোড? (অথবা উত্তরে SKIP লিখুন)'),
  ('ask_postal', 'ru', 'Почтовый индекс? (или ответьте SKIP)'),
  ('ask_postal', 'ur', 'پوسٹل کوڈ؟ (یا SKIP کا جواب دیں)'),
  ('err_postal', 'en', 'That postal code doesn''t look right. Send it again, or reply SKIP.'),
  ('err_postal', 'es', 'Ese código postal no parece correcto. Envíelo de nuevo, o responda SALTAR.'),
  ('err_postal', 'fr', 'Ce code postal ne semble pas correct. Renvoyez-le, ou répondez SAUTER.'),
  ('err_postal', 'pt', 'Esse código postal não parece correto. Envie de novo, ou responda PULAR.'),
  ('err_postal', 'zh', '邮政编码似乎不正确。请重新发送，或回复“跳过”。'),
  ('err_postal', 'ar', 'يبدو أن الرمز البريدي غير صحيح. أرسله مرة أخرى، أو أجب بـ SKIP.'),
  ('err_postal', 'hi', 'यह पोस्टल कोड सही नहीं लगता। फिर से भेजें, या SKIP लिखें।'),
  ('err_postal', 'bn', 'পোস্টাল কোডটি সঠিক মনে হচ্ছে না। আবার পাঠান, অথবা SKIP লিখুন।'),
  ('err_postal', 'ru', 'Похоже, индекс указан неверно. Пришлите его ещё раз или ответьте SKIP.'),
  ('err_postal', 'ur', 'یہ پوسٹل کوڈ درست نہیں لگتا۔ دوبارہ بھیجیں، یا SKIP لکھیں۔')
on conflict (key, lang) do nothing;

update btw_prompts p set text = v.text from (values
  ('done', 'en', 'Thank you, you''re signed up! We''ll be in touch soon.'),
  ('done', 'es', '¡Gracias, ya está inscrito! Nos pondremos en contacto pronto.'),
  ('done', 'fr', 'Merci, votre inscription est faite ! Nous vous contacterons bientôt.'),
  ('done', 'pt', 'Obrigado, sua inscrição está feita! Entraremos em contato em breve.'),
  ('done', 'zh', '谢谢，报名已完成！我们会尽快与您联系。'),
  ('done', 'ar', 'شكرًا، تم تسجيلك! سنتواصل معك قريبًا.'),
  ('done', 'hi', 'धन्यवाद, आपका पंजीकरण हो गया! हम जल्द ही संपर्क करेंगे।'),
  ('done', 'bn', 'ধন্যবাদ, আপনার নিবন্ধন সম্পন্ন! আমরা শীঘ্রই যোগাযোগ করব।'),
  ('done', 'ru', 'Спасибо, вы зарегистрированы! Мы скоро свяжемся с вами.'),
  ('done', 'ur', 'شکریہ، آپ کی رجسٹریشن ہو گئی! ہم جلد رابطہ کریں گے۔'),
  ('done_reply', 'en', 'You''re all signed up. To see or change your answers, use the link we texted you.'),
  ('done_reply', 'es', 'Ya está inscrito. Para ver o cambiar sus respuestas, use el enlace que le enviamos.'),
  ('done_reply', 'fr', 'Vous êtes inscrit. Pour voir ou modifier vos réponses, utilisez le lien que nous vous avons envoyé.'),
  ('done_reply', 'pt', 'Você já está inscrito. Para ver ou mudar suas respostas, use o link que enviamos.'),
  ('done_reply', 'zh', '您已完成报名。如需查看或修改信息，请使用我们发送给您的链接。'),
  ('done_reply', 'ar', 'لقد اكتمل تسجيلك. لعرض إجاباتك أو تغييرها، استخدم الرابط الذي أرسلناه لك.'),
  ('done_reply', 'hi', 'आपका पंजीकरण पूरा हो गया है। जवाब देखने या बदलने के लिए हमारे भेजे लिंक का उपयोग करें।'),
  ('done_reply', 'bn', 'আপনার নিবন্ধন সম্পন্ন। উত্তর দেখতে বা বদলাতে আমাদের পাঠানো লিংকটি ব্যবহার করুন।'),
  ('done_reply', 'ru', 'Вы зарегистрированы. Чтобы посмотреть или изменить ответы, откройте ссылку, которую мы прислали.'),
  ('done_reply', 'ur', 'آپ کی رجسٹریشن مکمل ہے۔ جوابات دیکھنے یا بدلنے کے لیے ہمارا بھیجا ہوا لنک استعمال کریں۔'),
  ('help', 'en', 'Answer each question in one text. When you finish, we''ll text you a link to see or change your answers. Text MENU to change language.'),
  ('help', 'es', 'Responda cada pregunta en un mensaje. Al terminar, le enviaremos un enlace para ver o cambiar sus respuestas. Envíe MENU para cambiar de idioma.'),
  ('help', 'fr', 'Répondez à chaque question en un message. À la fin, nous enverrons un lien pour voir ou modifier vos réponses. Envoyez MENU pour changer de langue.'),
  ('help', 'pt', 'Responda cada pergunta em uma mensagem. No fim, enviaremos um link para ver ou mudar suas respostas. Envie MENU para mudar de idioma.'),
  ('help', 'zh', '每条短信回答一个问题。完成后，我们会发送链接供您查看或修改信息。发送 MENU 可更换语言。'),
  ('help', 'ar', 'أجب عن كل سؤال في رسالة واحدة. عند الانتهاء سنرسل لك رابطًا لعرض إجاباتك أو تغييرها. أرسل MENU لتغيير اللغة.'),
  ('help', 'hi', 'हर सवाल का जवाब एक संदेश में दें। पूरा होने पर हम जवाब देखने या बदलने का लिंक भेजेंगे। भाषा बदलने के लिए MENU भेजें।'),
  ('help', 'bn', 'প্রতিটি প্রশ্নের উত্তর একটি বার্তায় দিন। শেষ হলে উত্তর দেখতে বা বদলাতে আমরা একটি লিংক পাঠাব। ভাষা বদলাতে MENU পাঠান।'),
  ('help', 'ru', 'Отвечайте на каждый вопрос одним сообщением. В конце мы пришлём ссылку, чтобы посмотреть или изменить ответы. Чтобы сменить язык, отправьте MENU.'),
  ('help', 'ur', 'ہر سوال کا جواب ایک پیغام میں دیں۔ آخر میں ہم جوابات دیکھنے یا بدلنے کا لنک بھیجیں گے۔ زبان بدلنے کے لیے MENU بھیجیں۔')
) as v(key, lang, text) where p.key = v.key and p.lang = v.lang;

-- Only where the wrong text is still there.
update btw_prompts p set text = v.fixed from (values
  ('sum_zip', 'es', 'CREMALLERA', 'Código postal'),
  ('sum_zip', 'fr', 'FERMETURE ÉCLAIR', 'Code postal'),
  ('sum_zip', 'zh', '拉链', '邮编'),
  ('sum_zip', 'ar', 'أَزِيز', 'الرمز البريدي'),
  ('sum_state', 'ru', 'Состояние', 'Штат'),
  ('sum_state', 'zh', '状态', '州')
) as v(key, lang, wrong, fixed) where p.key = v.key and p.lang = v.lang and p.text = v.wrong;

update btw_prompt_keys set description = 'Sent with the link when a signup is finished (the last answer, or DONE again).' where key = 'done';
