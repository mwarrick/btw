-- Finishing touches (2026-10-25):
-- * texted baptism counts: words around the number ("14 bautismos"), number
--   words ("nove"), a confirmation for one that looks too high
--   (btw_churches.baptisms_pending), a question when baptisms are mentioned
--   without a number (lib/counts.js, api/sms-inbound.js);
-- * RESTART no longer erases a finished signup (restart_locked);
-- * the first 30 days ask "Are you 18 or older?" and take a phone for the
--   church only from adults (btw_journeys.adult).
alter table btw_churches add column if not exists baptisms_pending int;
alter table btw_churches add column if not exists baptisms_pending_at timestamptz;
alter table btw_journeys add column if not exists adult boolean;

insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('count_confirm', 'system', 'Texted after signup: a baptism count that looks too high, asked before saving. Keep {count}; the YES word must be in kw_yes.', '{count}', 830),
  ('count_not_saved', 'system', 'Texted after signup: a NO to count_confirm.', '{}', 831),
  ('count_ask', 'system', 'Texted after signup: a text about baptisms without a number.', '{}', 832),
  ('restart_locked', 'system', 'Texted after signup: RESTART no longer erases a finished signup. Keep {link}.', '{link}', 833),
  ('web_journey_minor', 'system', 'Church page, Newly baptized: under 18 (no phone is asked for).', '{}', 834)
on conflict (key) do nothing;

insert into btw_prompts (key, lang, text) values
  ('count_confirm', 'en', 'Did you mean {count} baptisms? Reply YES to save it, or send the right number.'),
  ('count_confirm', 'es', '¿Quiso decir {count} bautismos? Responda SÍ para guardarlo, o envíe el número correcto.'),
  ('count_confirm', 'fr', 'Vouliez-vous dire {count} baptêmes ? Répondez OUI pour l''enregistrer, ou envoyez le bon nombre.'),
  ('count_confirm', 'pt', 'Você quis dizer {count} batismos? Responda SIM para salvar, ou envie o número certo.'),
  ('count_confirm', 'zh', '您是指 {count} 人受洗吗？回复“是”保存，或发送正确的数字。'),
  ('count_confirm', 'ar', 'هل تقصد {count} معمودية؟ أرسل نعم للحفظ، أو أرسل العدد الصحيح.'),
  ('count_confirm', 'hi', 'क्या आपका मतलब {count} बपतिस्मा है? सेव करने के लिए हाँ लिखें, या सही संख्या भेजें।'),
  ('count_confirm', 'bn', 'আপনি কি {count}টি বাপ্তিস্ম বোঝাতে চেয়েছেন? সেভ করতে হ্যাঁ লিখুন, বা সঠিক সংখ্যা পাঠান।'),
  ('count_confirm', 'ru', 'Вы имели в виду {count} крещений? Ответьте ДА, чтобы сохранить, или пришлите верное число.'),
  ('count_confirm', 'ur', 'کیا آپ کا مطلب {count} بپتسمے ہے؟ محفوظ کرنے کے لیے ہاں لکھیں، یا درست تعداد بھیجیں۔'),
  ('count_not_saved', 'en', 'OK, not saved. Send the right number of baptisms whenever you''re ready.'),
  ('count_not_saved', 'es', 'De acuerdo, no se guardó. Envíe el número correcto de bautismos cuando quiera.'),
  ('count_not_saved', 'fr', 'D''accord, rien n''est enregistré. Envoyez le bon nombre de baptêmes quand vous voulez.'),
  ('count_not_saved', 'pt', 'Certo, não foi salvo. Envie o número certo de batismos quando quiser.'),
  ('count_not_saved', 'zh', '好的，未保存。准备好后请发送正确的受洗人数。'),
  ('count_not_saved', 'ar', 'حسنًا، لم يُحفظ. أرسل العدد الصحيح للمعموديات متى شئت.'),
  ('count_not_saved', 'hi', 'ठीक है, सेव नहीं किया। जब चाहें बपतिस्मा की सही संख्या भेजें।'),
  ('count_not_saved', 'bn', 'ঠিক আছে, সেভ করা হয়নি। যখন খুশি বাপ্তিস্মের সঠিক সংখ্যা পাঠান।'),
  ('count_not_saved', 'ru', 'Хорошо, не сохранено. Пришлите верное число крещений, когда будете готовы.'),
  ('count_not_saved', 'ur', 'ٹھیک ہے، محفوظ نہیں کیا۔ جب چاہیں بپتسموں کی درست تعداد بھیجیں۔'),
  ('count_ask', 'en', 'Praise God! How many people were baptized? Reply with just the number.'),
  ('count_ask', 'es', '¡Gloria a Dios! ¿Cuántas personas se bautizaron? Responda solo con el número.'),
  ('count_ask', 'fr', 'Gloire à Dieu ! Combien de personnes ont été baptisées ? Répondez seulement avec le nombre.'),
  ('count_ask', 'pt', 'Glória a Deus! Quantas pessoas foram batizadas? Responda só com o número.'),
  ('count_ask', 'zh', '感谢神！有多少人受洗？请只回复数字。'),
  ('count_ask', 'ar', 'المجد لله! كم شخصًا تعمّد؟ أرسل الرقم فقط.'),
  ('count_ask', 'hi', 'परमेश्वर की स्तुति हो! कितने लोगों ने बपतिस्मा लिया? सिर्फ़ संख्या लिखकर जवाब दें।'),
  ('count_ask', 'bn', 'ঈশ্বরের প্রশংসা হোক! কতজন বাপ্তিস্ম নিয়েছেন? শুধু সংখ্যাটি লিখে উত্তর দিন।'),
  ('count_ask', 'ru', 'Слава Богу! Сколько человек крестились? Пришлите только число.'),
  ('count_ask', 'ur', 'خدا کی تمجید ہو! کتنے لوگوں نے بپتسمہ لیا؟ صرف تعداد لکھ کر جواب دیں۔'),
  ('restart_locked', 'en', 'Your signup is finished, so RESTART won''t erase it. See or change your answers here: {link}'),
  ('restart_locked', 'es', 'Su registro está completo, así que REINICIAR no lo borrará. Vea o cambie sus respuestas aquí: {link}'),
  ('restart_locked', 'fr', 'Votre inscription est terminée, RECOMMENCER ne l''effacera donc pas. Voyez ou modifiez vos réponses ici : {link}'),
  ('restart_locked', 'pt', 'Seu cadastro está concluído, então REINICIAR não vai apagá-lo. Veja ou altere suas respostas aqui: {link}'),
  ('restart_locked', 'zh', '您的登记已完成，重新开始不会删除它。在这里查看或修改您的回答：{link}'),
  ('restart_locked', 'ar', 'اكتمل تسجيلك، لذا لن يمحوه أمر البدء من جديد. اطّلع على إجاباتك أو غيّرها هنا: {link}'),
  ('restart_locked', 'hi', 'आपका पंजीकरण पूरा हो गया है, इसलिए फिर से शुरू करने से यह नहीं मिटेगा। अपने जवाब यहाँ देखें या बदलें: {link}'),
  ('restart_locked', 'bn', 'আপনার নিবন্ধন সম্পূর্ণ, তাই আবার শুরু করলে তা মুছবে না। আপনার উত্তর এখানে দেখুন বা বদলান: {link}'),
  ('restart_locked', 'ru', 'Ваша регистрация завершена, поэтому ЗАНОВО её не сотрёт. Посмотрите или измените ответы здесь: {link}'),
  ('restart_locked', 'ur', 'آپ کی رجسٹریشن مکمل ہو چکی ہے، اس لیے دوبارہ شروع کرنے سے یہ نہیں مٹے گی۔ اپنے جواب یہاں دیکھیں یا بدلیں: {link}'),
  ('web_journey_minor', 'en', 'Under 18'),
  ('web_journey_minor', 'es', 'Menor de 18'),
  ('web_journey_minor', 'fr', 'Moins de 18 ans'),
  ('web_journey_minor', 'pt', 'Menor de 18'),
  ('web_journey_minor', 'zh', '未满18岁'),
  ('web_journey_minor', 'ar', 'دون 18 عامًا'),
  ('web_journey_minor', 'hi', '18 से कम'),
  ('web_journey_minor', 'bn', '18-এর কম'),
  ('web_journey_minor', 'ru', 'Младше 18'),
  ('web_journey_minor', 'ur', '18 سے کم')
on conflict (key, lang) do nothing;
