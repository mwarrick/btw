-- After signup: a text that's only a number is the church's baptism count
-- (btw_churches.baptisms, the latest one; baptisms_at when it came);
-- texted photos get a receipt with a link to the photo on their page; any
-- other text the bot doesn't understand still goes to the team and also
-- gets info_reply (at most once a day). The Photos tab says photos are
-- shown for a limited time. Translations are by hand.
alter table btw_churches add column baptisms integer, add column baptisms_at timestamptz;

insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('info_reply', 'system', 'After signup, a text the bot doesn''t understand (at most once a day; the text still goes to the team).', '{}', 730),
  ('count_saved', 'system', 'After signup, a text that''s just a number: the baptism count was saved. Keep {count}.', '{count}', 731),
  ('photo_received', 'system', 'A texted photo was received (after signup). Keep {link}: opens that photo on their page.', '{link}', 732),
  ('photos_received', 'system', 'Several photos in one text were received. Keep {link}: their page''s Photos tab.', '{link}', 733),
  ('web_photos_temporary', 'system', 'Signup page, Photos: says photos are shown for a limited time only.', '{}', 712)
on conflict (key) do nothing;

insert into btw_prompts (key, lang, text) values
  ('info_reply', 'en', 'You can send us baptism photos and tell us how many people were baptized. To send us a baptism count, just enter a number.'),
  ('info_reply', 'es', 'Puede enviarnos fotos de los bautismos y decirnos cuántas personas fueron bautizadas. Para enviar el número de bautismos, solo escriba un número.'),
  ('info_reply', 'fr', 'Vous pouvez nous envoyer des photos des baptêmes et nous dire combien de personnes ont été baptisées. Pour cela, envoyez simplement un nombre.'),
  ('info_reply', 'pt', 'Você pode nos enviar fotos dos batismos e dizer quantas pessoas foram batizadas. Para informar o total de batismos, basta enviar um número.'),
  ('info_reply', 'zh', '您可以给我们发送洗礼照片，并告诉我们有多少人受洗。要告诉我们受洗人数，只需发送一个数字。'),
  ('info_reply', 'ar', 'يمكنك إرسال صور المعمودية إلينا وإخبارنا بعدد من تعمّدوا. لإرسال عدد المعموديات، أرسل رقمًا فقط.'),
  ('info_reply', 'hi', 'आप हमें बपतिस्मा की फ़ोटो भेज सकते हैं और बता सकते हैं कि कितने लोगों का बपतिस्मा हुआ। बपतिस्मा की संख्या भेजने के लिए बस एक अंक लिखें।'),
  ('info_reply', 'bn', 'আপনি আমাদের বাপ্তিস্মের ছবি পাঠাতে এবং কতজন বাপ্তিস্ম নিয়েছেন তা জানাতে পারেন। বাপ্তিস্মের সংখ্যা পাঠাতে শুধু একটি সংখ্যা লিখুন।'),
  ('info_reply', 'ru', 'Вы можете присылать нам фото крещений и сообщать, сколько человек крестилось. Чтобы сообщить число крещений, просто отправьте число.'),
  ('info_reply', 'ur', 'آپ ہمیں بپتسمہ کی تصاویر بھیج سکتے ہیں اور بتا سکتے ہیں کہ کتنے لوگوں نے بپتسمہ لیا۔ بپتسمہ کی تعداد بھیجنے کے لیے بس ایک نمبر لکھیں۔'),
  ('count_saved', 'en', 'Thank you! We recorded {count} baptisms. Send a new number anytime to update it.'),
  ('count_saved', 'es', '¡Gracias! Registramos {count} bautismos. Envíe un nuevo número cuando quiera para actualizarlo.'),
  ('count_saved', 'fr', 'Merci ! Nous avons noté {count} baptêmes. Envoyez un nouveau nombre à tout moment pour le mettre à jour.'),
  ('count_saved', 'pt', 'Obrigado! Registramos {count} batismos. Envie um novo número quando quiser para atualizar.'),
  ('count_saved', 'zh', '谢谢！我们已记录 {count} 人受洗。如需更新，随时发送新的数字。'),
  ('count_saved', 'ar', 'شكرًا! سجّلنا {count} معموديات. أرسل رقمًا جديدًا في أي وقت لتحديثه.'),
  ('count_saved', 'hi', 'धन्यवाद! हमने {count} बपतिस्मा दर्ज किए। इसे बदलने के लिए कभी भी नया अंक भेजें।'),
  ('count_saved', 'bn', 'ধন্যবাদ! আমরা {count}টি বাপ্তিস্ম লিখে রেখেছি। হালনাগাদ করতে যেকোনো সময় নতুন সংখ্যা পাঠান।'),
  ('count_saved', 'ru', 'Спасибо! Мы записали число крещений: {count}. Чтобы изменить его, пришлите новое число.'),
  ('count_saved', 'ur', 'شکریہ! ہم نے {count} بپتسمے درج کر لیے۔ اسے بدلنے کے لیے کسی بھی وقت نیا نمبر بھیجیں۔'),
  ('photo_received', 'en', 'Photo received, thank you! See it here: {link}'),
  ('photo_received', 'es', '¡Foto recibida, gracias! Véala aquí: {link}'),
  ('photo_received', 'fr', 'Photo reçue, merci ! Voyez-la ici : {link}'),
  ('photo_received', 'pt', 'Foto recebida, obrigado! Veja aqui: {link}'),
  ('photo_received', 'zh', '已收到照片，谢谢！在这里查看：{link}'),
  ('photo_received', 'ar', 'تم استلام الصورة، شكرًا! شاهدها هنا: {link}'),
  ('photo_received', 'hi', 'फ़ोटो मिल गई, धन्यवाद! यहाँ देखें: {link}'),
  ('photo_received', 'bn', 'ছবি পেয়েছি, ধন্যবাদ! এখানে দেখুন: {link}'),
  ('photo_received', 'ru', 'Фото получено, спасибо! Посмотреть: {link}'),
  ('photo_received', 'ur', 'تصویر موصول ہو گئی، شکریہ! یہاں دیکھیں: {link}'),
  ('photos_received', 'en', 'Photos received, thank you! See them here: {link}'),
  ('photos_received', 'es', '¡Fotos recibidas, gracias! Véalas aquí: {link}'),
  ('photos_received', 'fr', 'Photos reçues, merci ! Voyez-les ici : {link}'),
  ('photos_received', 'pt', 'Fotos recebidas, obrigado! Veja aqui: {link}'),
  ('photos_received', 'zh', '已收到照片，谢谢！在这里查看：{link}'),
  ('photos_received', 'ar', 'تم استلام الصور، شكرًا! شاهدها هنا: {link}'),
  ('photos_received', 'hi', 'फ़ोटो मिल गईं, धन्यवाद! यहाँ देखें: {link}'),
  ('photos_received', 'bn', 'ছবিগুলো পেয়েছি, ধন্যবাদ! এখানে দেখুন: {link}'),
  ('photos_received', 'ru', 'Фото получены, спасибо! Посмотреть: {link}'),
  ('photos_received', 'ur', 'تصاویر موصول ہو گئیں، شکریہ! یہاں دیکھیں: {link}'),
  ('web_photos_temporary', 'en', 'Photos are shown here for a limited time only. Please keep your own copies.'),
  ('web_photos_temporary', 'es', 'Las fotos se muestran aquí solo por tiempo limitado. Guarde sus propias copias.'),
  ('web_photos_temporary', 'fr', 'Les photos ne sont affichées ici que pour une durée limitée. Gardez vos propres copies.'),
  ('web_photos_temporary', 'pt', 'As fotos aparecem aqui só por tempo limitado. Guarde suas próprias cópias.'),
  ('web_photos_temporary', 'zh', '照片仅在此处显示一段时间，请自行保存副本。'),
  ('web_photos_temporary', 'ar', 'تُعرض الصور هنا لفترة محدودة فقط. يرجى الاحتفاظ بنسخ منها.'),
  ('web_photos_temporary', 'hi', 'फ़ोटो यहाँ केवल सीमित समय के लिए दिखाई जाती हैं। कृपया अपनी प्रतियाँ रखें।'),
  ('web_photos_temporary', 'bn', 'ছবিগুলো এখানে কেবল সীমিত সময়ের জন্য দেখানো হয়। অনুগ্রহ করে নিজের কপি রাখুন।'),
  ('web_photos_temporary', 'ru', 'Фото показываются здесь только ограниченное время. Сохраните свои копии.'),
  ('web_photos_temporary', 'ur', 'تصاویر یہاں صرف محدود وقت کے لیے دکھائی جاتی ہیں۔ براہ کرم اپنی کاپیاں رکھیں۔')
on conflict (key, lang) do nothing;
