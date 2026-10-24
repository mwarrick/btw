-- Testimonies, more of the hackathon brief (tracks/2-testimony-sharing):
-- phone numbers from any country on /story (texting them depends on the
-- provider: lib/voipms.js canText), sample stories from the brief's test data
-- (btw_testimonies.simulated), a microphone button per question, and picking
-- the line for the story picture.
alter table btw_testimonies add column if not exists simulated boolean not null default false;

insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('story_phone_invalid', 'system', 'Testimony start page: the phone isn''t a number we can read (any country).', '{}', 790),
  ('story_cant_text', 'system', 'Testimony start page: our texting provider can''t reach that country yet.', '{}', 791),
  ('story_speak', 'system', 'Testimony page: the microphone button beside each question.', '{}', 792),
  ('story_listening', 'system', 'Testimony page: the microphone button while it listens.', '{}', 793),
  ('story_card_pick', 'system', 'Testimony page: above the lines they can put on their picture.', '{}', 794)
on conflict (key) do nothing;

insert into btw_prompts (key, lang, text) values
  ('story_phone_invalid', 'en', 'Enter your mobile number. Outside the US and Canada, start with + and your country code, e.g. +51 987 654 321.'),
  ('story_phone_invalid', 'es', 'Escriba su número de celular. Fuera de EE. UU. y Canadá, empiece con + y el código de su país, p. ej. +51 987 654 321.'),
  ('story_phone_invalid', 'fr', 'Entrez votre numéro de mobile. Hors des États-Unis et du Canada, commencez par + et l''indicatif du pays, p. ex. +33 6 12 34 56 78.'),
  ('story_phone_invalid', 'pt', 'Digite seu número de celular. Fora dos EUA e do Canadá, comece com + e o código do país, ex.: +55 11 91234 5678.'),
  ('story_phone_invalid', 'zh', '请输入您的手机号码。美国和加拿大以外，请以 + 和国家代码开头，例如 +86 138 0013 8000。'),
  ('story_phone_invalid', 'ar', 'أدخل رقم هاتفك المحمول. خارج الولايات المتحدة وكندا، ابدأ بـ + ورمز بلدك، مثل +20 100 123 4567.'),
  ('story_phone_invalid', 'hi', 'अपना मोबाइल नंबर लिखें। अमेरिका और कनाडा के बाहर, + और अपने देश का कोड लगाकर शुरू करें, जैसे +91 98765 43210।'),
  ('story_phone_invalid', 'bn', 'আপনার মোবাইল নম্বর লিখুন। যুক্তরাষ্ট্র ও কানাডার বাইরে + ও দেশের কোড দিয়ে শুরু করুন, যেমন +880 1712 345678।'),
  ('story_phone_invalid', 'ru', 'Введите номер мобильного. За пределами США и Канады начните с + и кода страны, например +7 912 345 67 89.'),
  ('story_phone_invalid', 'ur', 'اپنا موبائل نمبر لکھیں۔ امریکہ اور کینیڈا سے باہر + اور اپنے ملک کا کوڈ لگا کر شروع کریں، جیسے +92 300 1234567۔'),
  ('story_cant_text', 'en', 'We can''t text numbers in your country yet. Please check back soon.'),
  ('story_cant_text', 'es', 'Todavía no podemos enviar mensajes a números de su país. Vuelva a intentarlo pronto.'),
  ('story_cant_text', 'fr', 'Nous ne pouvons pas encore envoyer de SMS aux numéros de votre pays. Réessayez bientôt.'),
  ('story_cant_text', 'pt', 'Ainda não conseguimos enviar mensagens para números do seu país. Tente de novo em breve.'),
  ('story_cant_text', 'zh', '我们暂时还无法给您所在国家的号码发短信。请稍后再试。'),
  ('story_cant_text', 'ar', 'لا يمكننا بعد إرسال رسائل إلى أرقام بلدك. يرجى المحاولة قريبًا.'),
  ('story_cant_text', 'hi', 'हम अभी आपके देश के नंबरों पर मैसेज नहीं भेज सकते। कृपया जल्द दोबारा कोशिश करें।'),
  ('story_cant_text', 'bn', 'আমরা এখনো আপনার দেশের নম্বরে মেসেজ পাঠাতে পারি না। শিগগিরই আবার চেষ্টা করুন।'),
  ('story_cant_text', 'ru', 'Мы пока не можем отправлять сообщения на номера в вашей стране. Попробуйте позже.'),
  ('story_cant_text', 'ur', 'ہم ابھی آپ کے ملک کے نمبروں پر پیغام نہیں بھیج سکتے۔ براہ کرم جلد دوبارہ کوشش کریں۔'),
  ('story_speak', 'en', 'Speak'),
  ('story_speak', 'es', 'Hablar'),
  ('story_speak', 'fr', 'Parler'),
  ('story_speak', 'pt', 'Falar'),
  ('story_speak', 'zh', '说话'),
  ('story_speak', 'ar', 'تحدث'),
  ('story_speak', 'hi', 'बोलें'),
  ('story_speak', 'bn', 'বলুন'),
  ('story_speak', 'ru', 'Говорить'),
  ('story_speak', 'ur', 'بولیں'),
  ('story_listening', 'en', 'Listening… tap to stop'),
  ('story_listening', 'es', 'Escuchando… toque para parar'),
  ('story_listening', 'fr', 'J''écoute… touchez pour arrêter'),
  ('story_listening', 'pt', 'Ouvindo… toque para parar'),
  ('story_listening', 'zh', '正在听…点击停止'),
  ('story_listening', 'ar', 'أستمع… اضغط للإيقاف'),
  ('story_listening', 'hi', 'सुन रहे हैं… रोकने के लिए टैप करें'),
  ('story_listening', 'bn', 'শুনছি… থামাতে ট্যাপ করুন'),
  ('story_listening', 'ru', 'Слушаю… нажмите, чтобы остановить'),
  ('story_listening', 'ur', 'سن رہے ہیں… روکنے کے لیے ٹیپ کریں'),
  ('story_card_pick', 'en', 'Tap the line you want on your picture:'),
  ('story_card_pick', 'es', 'Toque la frase que quiere en su imagen:'),
  ('story_card_pick', 'fr', 'Touchez la phrase à mettre sur votre image :'),
  ('story_card_pick', 'pt', 'Toque a frase que quer na sua imagem:'),
  ('story_card_pick', 'zh', '点击您想放在图片上的句子：'),
  ('story_card_pick', 'ar', 'اضغط على الجملة التي تريدها في صورتك:'),
  ('story_card_pick', 'hi', 'जो पंक्ति तस्वीर पर चाहिए, उस पर टैप करें:'),
  ('story_card_pick', 'bn', 'ছবিতে যে লাইনটি চান, সেটিতে ট্যাপ করুন:'),
  ('story_card_pick', 'ru', 'Нажмите на фразу для вашей картинки:'),
  ('story_card_pick', 'ur', 'جو جملہ تصویر پر چاہیے، اس پر ٹیپ کریں:')
on conflict (key, lang) do nothing;

-- Reworded: numbers from any country.
update btw_prompts set text = 'Your mobile number (with + and your country code outside the US and Canada). We''ll text you a private link.', updated_at = now() where key = 'story_phone_hint' and lang = 'en';
update btw_prompts set text = 'Su número de celular (con + y el código de su país fuera de EE. UU. y Canadá). Le enviaremos un enlace privado por mensaje.', updated_at = now() where key = 'story_phone_hint' and lang = 'es';
update btw_prompts set text = 'Votre numéro de mobile (avec + et l''indicatif du pays hors États-Unis et Canada). Nous vous enverrons un lien privé par SMS.', updated_at = now() where key = 'story_phone_hint' and lang = 'fr';
update btw_prompts set text = 'Seu número de celular (com + e o código do país fora dos EUA e Canadá). Enviaremos um link particular por mensagem.', updated_at = now() where key = 'story_phone_hint' and lang = 'pt';
update btw_prompts set text = '您的手机号码（美国和加拿大以外请加 + 和国家代码）。我们会用短信发给您一个专属链接。', updated_at = now() where key = 'story_phone_hint' and lang = 'zh';
update btw_prompts set text = 'رقم هاتفك المحمول (مع + ورمز بلدك خارج الولايات المتحدة وكندا). سنرسل لك رابطًا خاصًا برسالة.', updated_at = now() where key = 'story_phone_hint' and lang = 'ar';
update btw_prompts set text = 'आपका मोबाइल नंबर (अमेरिका और कनाडा के बाहर + और देश के कोड के साथ)। हम आपको एक निजी लिंक मैसेज करेंगे।', updated_at = now() where key = 'story_phone_hint' and lang = 'hi';
update btw_prompts set text = 'আপনার মোবাইল নম্বর (যুক্তরাষ্ট্র ও কানাডার বাইরে + ও দেশের কোডসহ)। আমরা আপনাকে একটি ব্যক্তিগত লিংক পাঠাব।', updated_at = now() where key = 'story_phone_hint' and lang = 'bn';
update btw_prompts set text = 'Ваш номер мобильного (за пределами США и Канады — с + и кодом страны). Мы пришлём вам личную ссылку в сообщении.', updated_at = now() where key = 'story_phone_hint' and lang = 'ru';
update btw_prompts set text = 'آپ کا موبائل نمبر (امریکہ اور کینیڈا سے باہر + اور ملک کے کوڈ کے ساتھ)۔ ہم آپ کو ایک نجی لنک بھیجیں گے۔', updated_at = now() where key = 'story_phone_hint' and lang = 'ur';
