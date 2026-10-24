-- Testimonies: a QR code on the church's Stories tab that opens /story with
-- that church picked (like the 30 days' on Newly baptized).
insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('web_story_qr', 'system', 'Church page, Stories: heading of the QR code card.', '{}', 800),
  ('web_story_qr_hint', 'system', 'Church page, Stories: under the QR code heading.', '{}', 801)
on conflict (key) do nothing;

insert into btw_prompts (key, lang, text) values
  ('web_story_qr', 'en', 'Invite them to share their story'),
  ('web_story_qr', 'es', 'Invítelos a compartir su historia'),
  ('web_story_qr', 'fr', 'Invitez-les à partager leur histoire'),
  ('web_story_qr', 'pt', 'Convide-os a compartilhar sua história'),
  ('web_story_qr', 'zh', '邀请他们分享自己的故事'),
  ('web_story_qr', 'ar', 'ادعُهم لمشاركة قصتهم'),
  ('web_story_qr', 'hi', 'उन्हें अपनी कहानी साझा करने के लिए आमंत्रित करें'),
  ('web_story_qr', 'bn', 'তাঁদের গল্প শেয়ার করতে আমন্ত্রণ জানান'),
  ('web_story_qr', 'ru', 'Пригласите их рассказать свою историю'),
  ('web_story_qr', 'ur', 'انہیں اپنی کہانی شیئر کرنے کی دعوت دیں'),
  ('web_story_qr_hint', 'en', 'Print it or show it after a baptism. Scanning it opens the story form with your church already picked.'),
  ('web_story_qr_hint', 'es', 'Imprímalo o muéstrelo después de un bautismo. Al escanearlo se abre el formulario de la historia con su iglesia ya elegida.'),
  ('web_story_qr_hint', 'fr', 'Imprimez-le ou montrez-le après un baptême. En le scannant, on ouvre le formulaire d''histoire avec votre église déjà choisie.'),
  ('web_story_qr_hint', 'pt', 'Imprima ou mostre depois de um batismo. Ao escanear, abre o formulário da história com sua igreja já escolhida.'),
  ('web_story_qr_hint', 'zh', '在洗礼后打印出来或展示。扫描后会打开故事表格，并已选好您的教会。'),
  ('web_story_qr_hint', 'ar', 'اطبعه أو اعرضه بعد المعمودية. مسحه يفتح نموذج القصة مع اختيار كنيستك مسبقًا.'),
  ('web_story_qr_hint', 'hi', 'बपतिस्मा के बाद इसे प्रिंट करें या दिखाएँ। स्कैन करने पर कहानी का फ़ॉर्म आपका चर्च चुना हुआ खुलेगा।'),
  ('web_story_qr_hint', 'bn', 'বাপ্তিস্মের পরে এটি প্রিন্ট করুন বা দেখান। স্ক্যান করলে আপনার চার্চ বাছাই করা অবস্থায় গল্পের ফর্ম খুলবে।'),
  ('web_story_qr_hint', 'ru', 'Распечатайте или покажите после крещения. Отсканировав его, человек откроет форму истории, где ваша церковь уже выбрана.'),
  ('web_story_qr_hint', 'ur', 'بپتسمہ کے بعد اسے پرنٹ کریں یا دکھائیں۔ اسکین کرنے پر کہانی کا فارم آپ کا چرچ چنا ہوا کھلے گا۔')
on conflict (key, lang) do nothing;
