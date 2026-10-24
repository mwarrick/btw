-- The web form right after the language question (not only at the end):
-- sms-inbound texts web_form_link with the church's own page, which
-- finishes a signup begun by text (web_finish_intro, web_finish_button).
insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('web_form_link', 'system', 'Texted right after the language is picked: their own page, to answer on a form instead. Keep {link}.', '{link}', 330),
  ('web_finish_intro', 'system', 'Church page, for a signup still being answered by text: the line under the logo.', '{}', 331),
  ('web_finish_button', 'system', 'Church page, for a signup still being answered by text: the button.', '{}', 332)
on conflict (key) do nothing;

insert into btw_prompts (key, lang, text) values
  ('web_form_link', 'en', 'Prefer a form? Answer every question on one page instead: {link} Or just keep replying here.'),
  ('web_form_link', 'es', '¿Prefiere un formulario? Responda todo en una sola página: {link} O siga respondiendo aquí.'),
  ('web_form_link', 'fr', 'Vous préférez un formulaire ? Répondez à tout sur une seule page : {link} Ou continuez à répondre ici.'),
  ('web_form_link', 'pt', 'Prefere um formulário? Responda tudo em uma só página: {link} Ou continue respondendo aqui.'),
  ('web_form_link', 'zh', '想用表格填写？可在一个页面上回答所有问题：{link} 或继续在这里回复。'),
  ('web_form_link', 'ar', 'تفضّل نموذجًا؟ أجب عن كل شيء في صفحة واحدة: {link} أو تابع الرد هنا.'),
  ('web_form_link', 'hi', 'फ़ॉर्म पसंद है? सब कुछ एक ही पेज पर भरें: {link} या यहीं जवाब देते रहें।'),
  ('web_form_link', 'bn', 'ফর্ম পছন্দ? সব উত্তর এক পাতায় দিন: {link} অথবা এখানেই উত্তর দিতে থাকুন।'),
  ('web_form_link', 'ru', 'Удобнее форма? Ответьте на всё на одной странице: {link} Или продолжайте отвечать здесь.'),
  ('web_form_link', 'ur', 'فارم پسند ہے؟ سب کچھ ایک ہی صفحے پر بھریں: {link} یا یہیں جواب دیتے رہیں۔'),
  ('web_finish_intro', 'en', 'Fill in your church''s details to finish signing up. Your answers by text are already here.'),
  ('web_finish_intro', 'es', 'Complete los datos de su iglesia para terminar la inscripción. Sus respuestas por mensaje ya están aquí.'),
  ('web_finish_intro', 'fr', 'Remplissez les informations de votre église pour terminer l''inscription. Vos réponses par SMS sont déjà là.'),
  ('web_finish_intro', 'pt', 'Preencha os dados da sua igreja para concluir a inscrição. Suas respostas por SMS já estão aqui.'),
  ('web_finish_intro', 'zh', '填写您教会的资料即可完成报名。您用短信回答的内容已在这里。'),
  ('web_finish_intro', 'ar', 'املأ بيانات كنيستك لإكمال التسجيل. إجاباتك بالرسائل موجودة هنا بالفعل.'),
  ('web_finish_intro', 'hi', 'पंजीकरण पूरा करने के लिए अपने चर्च की जानकारी भरें। संदेश से दिए आपके जवाब पहले से यहाँ हैं।'),
  ('web_finish_intro', 'bn', 'নাম লেখানো শেষ করতে আপনার চার্চের তথ্য দিন। বার্তায় দেওয়া উত্তরগুলো এখানে আছে।'),
  ('web_finish_intro', 'ru', 'Заполните данные церкви, чтобы завершить регистрацию. Ваши ответы по SMS уже здесь.'),
  ('web_finish_intro', 'ur', 'رجسٹریشن مکمل کرنے کے لیے اپنے چرچ کی تفصیلات بھریں۔ پیغام سے دیے گئے آپ کے جواب پہلے سے یہاں ہیں۔'),
  ('web_finish_button', 'en', 'Finish my signup'),
  ('web_finish_button', 'es', 'Terminar mi inscripción'),
  ('web_finish_button', 'fr', 'Terminer mon inscription'),
  ('web_finish_button', 'pt', 'Concluir minha inscrição'),
  ('web_finish_button', 'zh', '完成报名'),
  ('web_finish_button', 'ar', 'أكمل تسجيلي'),
  ('web_finish_button', 'hi', 'पंजीकरण पूरा करें'),
  ('web_finish_button', 'bn', 'নাম লেখানো শেষ করুন'),
  ('web_finish_button', 'ru', 'Завершить регистрацию'),
  ('web_finish_button', 'ur', 'رجسٹریشن مکمل کریں')
on conflict (key, lang) do nothing;
