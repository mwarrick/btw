-- The first 30 days, closer to the hackathon brief (tracks/3-first-30-days):
-- sample people for the demo (btw_journeys.simulated, added and removed with
-- the church simulations), "gone quiet" after 3 days without opening their
-- page (with "Last active" on the church's tab), and a QR code on the
-- church's page that starts the 30 days with that church picked.
alter table btw_journeys add column if not exists simulated boolean not null default false;

insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('web_journey_last', 'system', 'Church page, Newly baptized: when they last opened their page. Keep {when} (e.g. "3 days ago", written by the browser).', '{when}', 780),
  ('web_journey_qr', 'system', 'Church page, Newly baptized: heading of the QR code card.', '{}', 781),
  ('web_journey_qr_hint', 'system', 'Church page, Newly baptized: under the QR code heading.', '{}', 782),
  ('web_print', 'system', 'Church page: the Print button.', '{}', 783)
on conflict (key) do nothing;

insert into btw_prompts (key, lang, text) values
  ('web_journey_last', 'en', 'Last active {when}'),
  ('web_journey_last', 'es', 'Última actividad: {when}'),
  ('web_journey_last', 'fr', 'Dernière activité : {when}'),
  ('web_journey_last', 'pt', 'Última atividade: {when}'),
  ('web_journey_last', 'zh', '最近活动：{when}'),
  ('web_journey_last', 'ar', 'آخر نشاط: {when}'),
  ('web_journey_last', 'hi', 'आख़िरी बार सक्रिय: {when}'),
  ('web_journey_last', 'bn', 'শেষ সক্রিয়: {when}'),
  ('web_journey_last', 'ru', 'Последняя активность: {when}'),
  ('web_journey_last', 'ur', 'آخری بار سرگرم: {when}'),
  ('web_journey_qr', 'en', 'Invite them with a QR code'),
  ('web_journey_qr', 'es', 'Invítelos con un código QR'),
  ('web_journey_qr', 'fr', 'Invitez-les avec un code QR'),
  ('web_journey_qr', 'pt', 'Convide-os com um código QR'),
  ('web_journey_qr', 'zh', '用二维码邀请他们'),
  ('web_journey_qr', 'ar', 'ادعُهم برمز QR'),
  ('web_journey_qr', 'hi', 'QR कोड से उन्हें आमंत्रित करें'),
  ('web_journey_qr', 'bn', 'QR কোড দিয়ে তাঁদের আমন্ত্রণ জানান'),
  ('web_journey_qr', 'ru', 'Пригласите их с помощью QR-кода'),
  ('web_journey_qr', 'ur', 'QR کوڈ سے انہیں دعوت دیں'),
  ('web_journey_qr_hint', 'en', 'Print it or show it on a screen after a baptism. Scanning it starts their first 30 days with your church already picked.'),
  ('web_journey_qr_hint', 'es', 'Imprímalo o muéstrelo en una pantalla después de un bautismo. Al escanearlo empiezan sus primeros 30 días con su iglesia ya elegida.'),
  ('web_journey_qr_hint', 'fr', 'Imprimez-le ou affichez-le sur un écran après un baptême. En le scannant, on commence ses 30 premiers jours avec votre église déjà choisie.'),
  ('web_journey_qr_hint', 'pt', 'Imprima ou mostre numa tela depois de um batismo. Ao escanear, começam os primeiros 30 dias com sua igreja já escolhida.'),
  ('web_journey_qr_hint', 'zh', '在洗礼后打印出来或在屏幕上展示。扫描后即可开始头30天，并已选好您的教会。'),
  ('web_journey_qr_hint', 'ar', 'اطبعه أو اعرضه على شاشة بعد المعمودية. مسحه يبدأ أيامهم الثلاثين الأولى مع اختيار كنيستك مسبقًا.'),
  ('web_journey_qr_hint', 'hi', 'बपतिस्मा के बाद इसे प्रिंट करें या स्क्रीन पर दिखाएँ। इसे स्कैन करते ही आपका चर्च चुना हुआ होगा और उनके पहले 30 दिन शुरू होंगे।'),
  ('web_journey_qr_hint', 'bn', 'বাপ্তিস্মের পরে এটি প্রিন্ট করুন বা স্ক্রিনে দেখান। স্ক্যান করলে আপনার চার্চ বাছাই করা অবস্থায় তাঁদের প্রথম 30 দিন শুরু হবে।'),
  ('web_journey_qr_hint', 'ru', 'Распечатайте или покажите на экране после крещения. Отсканировав его, человек начнёт первые 30 дней, и ваша церковь уже будет выбрана.'),
  ('web_journey_qr_hint', 'ur', 'بپتسمہ کے بعد اسے پرنٹ کریں یا اسکرین پر دکھائیں۔ اسکین کرتے ہی آپ کا چرچ چنا ہوا ہوگا اور ان کے پہلے 30 دن شروع ہوں گے۔'),
  ('web_print', 'en', 'Print'),
  ('web_print', 'es', 'Imprimir'),
  ('web_print', 'fr', 'Imprimer'),
  ('web_print', 'pt', 'Imprimir'),
  ('web_print', 'zh', '打印'),
  ('web_print', 'ar', 'طباعة'),
  ('web_print', 'hi', 'प्रिंट करें'),
  ('web_print', 'bn', 'প্রিন্ট করুন'),
  ('web_print', 'ru', 'Печать'),
  ('web_print', 'ur', 'پرنٹ کریں')
on conflict (key, lang) do nothing;
