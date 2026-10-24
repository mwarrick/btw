-- Photos by text (MMS). Each picture is copied out of voip.ms into
-- btw-photos (source 'sms', message_id) and waits for permission: once the
-- signup is finished the church is asked by text (photo_ask); YES sets
-- consent_at (consent_text keeps the question and their reply), NO sets
-- declined_at (kept, not for sharing). Translations are by hand; each
-- photo_ask names its language's yes/no words (see kw_yes / kw_no).
alter table btw_photos add column declined_at timestamptz;

insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('photo_ask', 'system', 'Texted photo: asks permission to share publicly incl. social media; must name this language''s YES and NO words.', '{}', 720),
  ('photo_yes', 'system', 'Reply to YES on photo permission. Keep {link} (their page''s Photos tab).', '{link}', 721),
  ('photo_no', 'system', 'Reply to NO on photo permission: photos kept, not shared. Keep {link}.', '{link}', 722)
on conflict (key) do nothing;

insert into btw_prompts (key, lang, text) values
  ('photo_ask', 'en', 'Thanks for the photo! May Baptize 2027 share it publicly, including on social media? Everyone in it (a parent for anyone under 18) must agree. Reply YES or NO.'),
  ('photo_ask', 'es', '¡Gracias por la foto! ¿Baptize 2027 puede compartirla en público y en redes sociales? Todos en ella (un padre por los menores) deben aceptar. Responda SÍ o NO.'),
  ('photo_ask', 'fr', 'Merci pour la photo ! Baptize 2027 peut-il la partager en public et sur les réseaux sociaux ? Tous (ou un parent) doivent accepter. Répondez OUI ou NON.'),
  ('photo_ask', 'pt', 'Obrigado pela foto! O Baptize 2027 pode compartilhá-la em público e nas redes sociais? Todos nela (ou um responsável) devem concordar. Responda SIM ou NÃO.'),
  ('photo_ask', 'zh', '感谢您的照片！Baptize 2027 可以公开分享吗（包括社交媒体）？照片中的每个人（未满18岁者由父母）都须同意。请回复“是”或“否”。'),
  ('photo_ask', 'ar', 'شكرًا على الصورة! هل يمكن لـ Baptize 2027 نشرها علنًا، بما في ذلك على وسائل التواصل؟ يجب موافقة كل من فيها (أو أحد الوالدين لمن دون 18). أجب بنعم أو لا.'),
  ('photo_ask', 'hi', 'फ़ोटो के लिए धन्यवाद! क्या Baptize 2027 इसे सोशल मीडिया पर साझा कर सकता है? इसमें सभी की (बच्चों के लिए माता-पिता की) सहमति ज़रूरी है। हाँ या नहीं लिखें।'),
  ('photo_ask', 'bn', 'ছবির জন্য ধন্যবাদ! Baptize 2027 কি এটি সোশ্যাল মিডিয়াসহ প্রকাশ্যে শেয়ার করতে পারে? ছবির সবার (১৮-র কম হলে বাবা-মার) সম্মতি লাগবে। হ্যাঁ বা না লিখুন।'),
  ('photo_ask', 'ru', 'Спасибо за фото! Может ли Baptize 2027 публиковать его, в том числе в соцсетях? Нужно согласие всех на фото (за детей — родителя). Ответьте ДА или НЕТ.'),
  ('photo_ask', 'ur', 'تصویر کا شکریہ! کیا Baptize 2027 اسے سوشل میڈیا سمیت عوامی طور پر شیئر کر سکتا ہے؟ اس میں سب کی (18 سے کم کے لیے والدین کی) رضامندی ضروری ہے۔ ہاں یا نہیں لکھیں۔'),
  ('photo_yes', 'en', 'Thank you! We may share your photos. See or remove them anytime: {link}'),
  ('photo_yes', 'es', '¡Gracias! Podremos compartir sus fotos. Véalas o elimínelas cuando quiera: {link}'),
  ('photo_yes', 'fr', 'Merci ! Nous pourrons partager vos photos. Voyez-les ou supprimez-les ici : {link}'),
  ('photo_yes', 'pt', 'Obrigado! Poderemos compartilhar suas fotos. Veja ou remova quando quiser: {link}'),
  ('photo_yes', 'zh', '谢谢！我们可以分享您的照片。随时查看或删除：{link}'),
  ('photo_yes', 'ar', 'شكرًا! يمكننا مشاركة صورك. اعرضها أو احذفها في أي وقت: {link}'),
  ('photo_yes', 'hi', 'धन्यवाद! हम आपकी फ़ोटो साझा कर सकते हैं। उन्हें कभी भी देखें या हटाएँ: {link}'),
  ('photo_yes', 'bn', 'ধন্যবাদ! আমরা আপনার ছবি শেয়ার করতে পারব। যেকোনো সময় দেখুন বা মুছুন: {link}'),
  ('photo_yes', 'ru', 'Спасибо! Мы можем публиковать ваши фото. Посмотреть или удалить их: {link}'),
  ('photo_yes', 'ur', 'شکریہ! ہم آپ کی تصاویر شیئر کر سکتے ہیں۔ انہیں کسی بھی وقت دیکھیں یا ہٹائیں: {link}'),
  ('photo_no', 'en', 'Got it, we won''t share them publicly. See or remove your photos anytime: {link}'),
  ('photo_no', 'es', 'Entendido, no las compartiremos públicamente. Vea o elimine sus fotos cuando quiera: {link}'),
  ('photo_no', 'fr', 'Bien noté, nous ne les partagerons pas. Voyez ou supprimez vos photos ici : {link}'),
  ('photo_no', 'pt', 'Entendido, não vamos compartilhá-las publicamente. Veja ou remova suas fotos quando quiser: {link}'),
  ('photo_no', 'zh', '好的，我们不会公开分享这些照片。随时查看或删除：{link}'),
  ('photo_no', 'ar', 'حسنًا، لن ننشرها علنًا. اعرض صورك أو احذفها في أي وقت: {link}'),
  ('photo_no', 'hi', 'ठीक है, हम इन्हें सार्वजनिक रूप से साझा नहीं करेंगे। अपनी फ़ोटो कभी भी देखें या हटाएँ: {link}'),
  ('photo_no', 'bn', 'ঠিক আছে, আমরা এগুলো প্রকাশ্যে শেয়ার করব না। যেকোনো সময় আপনার ছবি দেখুন বা মুছুন: {link}'),
  ('photo_no', 'ru', 'Понятно, мы не будем их публиковать. Посмотреть или удалить фото: {link}'),
  ('photo_no', 'ur', 'ٹھیک ہے، ہم انہیں عوامی طور پر شیئر نہیں کریں گے۔ اپنی تصاویر کسی بھی وقت دیکھیں یا ہٹائیں: {link}')
on conflict (key, lang) do nothing;
