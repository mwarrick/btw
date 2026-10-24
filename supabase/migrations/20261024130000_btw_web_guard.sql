-- Spam protection for the signup form and Get my link (lib/web-guard.js):
-- the phone is confirmed with a texted code before a web signup is saved,
-- and texts from these forms are limited per visitor, per number and per day.
create table if not exists btw_web_requests (
  id          bigint generated always as identity primary key,
  kind        text not null check (kind in ('code', 'link', 'welcome', 'bot')),
  ip          text,                      -- the visitor's address, salted and hashed
  phone       text,                      -- +1XXXXXXXXXX
  created_at  timestamptz not null default now()
);
create index if not exists btw_web_requests_kind_idx on btw_web_requests (kind, created_at desc);
create index if not exists btw_web_requests_ip_idx on btw_web_requests (ip, created_at desc);
create index if not exists btw_web_requests_phone_idx on btw_web_requests (phone, created_at desc);
alter table btw_web_requests enable row level security;

create table if not exists btw_web_codes (
  phone       text primary key,          -- +1XXXXXXXXXX
  code_hash   text not null,             -- salted hash of the 6 digits
  attempts    int not null default 0,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
alter table btw_web_codes enable row level security;

insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('web_code_text', 'system', 'Texted by the signup form: the code that confirms their number. Keep {code}.', '{code}', 280),
  ('web_code_label', 'system', 'Signup form: above the box for the texted code.', '{}', 281),
  ('web_code_button', 'system', 'Signup form: the button once the code is asked for.', '{}', 282),
  ('web_code_resend', 'system', 'Signup form: asks for a new code.', '{}', 283),
  ('web_code_wrong', 'system', 'Signup form: the code typed isn''t the one texted.', '{}', 284),
  ('web_code_expired', 'system', 'Signup form: the code is past 10 minutes or had too many wrong tries.', '{}', 285),
  ('web_wait', 'system', 'Signup form: too many codes asked for from this number or device.', '{}', 286),
  ('web_busy', 'system', 'Signup form: the daily cap on texts is reached, or the code couldn''t be texted.', '{}', 287)
on conflict (key) do nothing;

insert into btw_prompts (key, lang, text) values
  ('web_code_text', 'en', 'Your Baptize 2027 code is {code}. It expires in 10 minutes.'),
  ('web_code_text', 'es', 'Su código de Baptize 2027 es {code}. Vence en 10 minutos.'),
  ('web_code_text', 'fr', 'Votre code Baptize 2027 est {code}. Il expire dans 10 minutes.'),
  ('web_code_text', 'pt', 'Seu código do Baptize 2027 é {code}. Ele expira em 10 minutos.'),
  ('web_code_text', 'zh', '您的 Baptize 2027 验证码是 {code}，10分钟内有效。'),
  ('web_code_text', 'ar', 'رمز Baptize 2027 الخاص بك هو {code}. ينتهي خلال 10 دقائق.'),
  ('web_code_text', 'hi', 'आपका Baptize 2027 कोड {code} है। यह 10 मिनट में समाप्त हो जाएगा।'),
  ('web_code_text', 'bn', 'আপনার Baptize 2027 কোড {code}। এটি 10 মিনিটে মেয়াদোত্তীর্ণ হবে।'),
  ('web_code_text', 'ru', 'Ваш код Baptize 2027: {code}. Он действует 10 минут.'),
  ('web_code_text', 'ur', 'آپ کا Baptize 2027 کوڈ {code} ہے۔ یہ 10 منٹ میں ختم ہو جائے گا۔'),
  ('web_code_label', 'en', 'We texted a 6-digit code to your phone. Enter it here.'),
  ('web_code_label', 'es', 'Le enviamos un código de 6 dígitos por mensaje. Escríbalo aquí.'),
  ('web_code_label', 'fr', 'Nous vous avons envoyé un code à 6 chiffres par SMS. Saisissez-le ici.'),
  ('web_code_label', 'pt', 'Enviamos um código de 6 dígitos por SMS. Digite-o aqui.'),
  ('web_code_label', 'zh', '我们已向您的手机发送6位数验证码，请在此输入。'),
  ('web_code_label', 'ar', 'أرسلنا رمزًا من 6 أرقام إلى هاتفك. أدخله هنا.'),
  ('web_code_label', 'hi', 'हमने आपके फ़ोन पर 6 अंकों का कोड भेजा है। उसे यहाँ लिखें।'),
  ('web_code_label', 'bn', 'আমরা আপনার ফোনে 6 অঙ্কের একটি কোড পাঠিয়েছি। এখানে লিখুন।'),
  ('web_code_label', 'ru', 'Мы отправили вам SMS с 6-значным кодом. Введите его здесь.'),
  ('web_code_label', 'ur', 'ہم نے آپ کے فون پر 6 ہندسوں کا کوڈ بھیجا ہے۔ اسے یہاں لکھیں۔'),
  ('web_code_button', 'en', 'Confirm'),
  ('web_code_button', 'es', 'Confirmar'),
  ('web_code_button', 'fr', 'Confirmer'),
  ('web_code_button', 'pt', 'Confirmar'),
  ('web_code_button', 'zh', '确认'),
  ('web_code_button', 'ar', 'تأكيد'),
  ('web_code_button', 'hi', 'पुष्टि करें'),
  ('web_code_button', 'bn', 'নিশ্চিত করুন'),
  ('web_code_button', 'ru', 'Подтвердить'),
  ('web_code_button', 'ur', 'تصدیق کریں'),
  ('web_code_resend', 'en', 'Send a new code'),
  ('web_code_resend', 'es', 'Enviar un código nuevo'),
  ('web_code_resend', 'fr', 'Envoyer un nouveau code'),
  ('web_code_resend', 'pt', 'Enviar um novo código'),
  ('web_code_resend', 'zh', '重新发送验证码'),
  ('web_code_resend', 'ar', 'أرسل رمزًا جديدًا'),
  ('web_code_resend', 'hi', 'नया कोड भेजें'),
  ('web_code_resend', 'bn', 'নতুন কোড পাঠান'),
  ('web_code_resend', 'ru', 'Отправить новый код'),
  ('web_code_resend', 'ur', 'نیا کوڈ بھیجیں'),
  ('web_code_wrong', 'en', 'That code isn''t right. Check the text and try again.'),
  ('web_code_wrong', 'es', 'Ese código no es correcto. Revise el mensaje e inténtelo de nuevo.'),
  ('web_code_wrong', 'fr', 'Ce code n''est pas bon. Vérifiez le SMS et réessayez.'),
  ('web_code_wrong', 'pt', 'Esse código não está correto. Confira a mensagem e tente de novo.'),
  ('web_code_wrong', 'zh', '验证码不正确，请核对短信后重试。'),
  ('web_code_wrong', 'ar', 'هذا الرمز غير صحيح. راجع الرسالة وحاول مرة أخرى.'),
  ('web_code_wrong', 'hi', 'यह कोड सही नहीं है। संदेश देखकर फिर से कोशिश करें।'),
  ('web_code_wrong', 'bn', 'কোডটি সঠিক নয়। বার্তাটি দেখে আবার চেষ্টা করুন।'),
  ('web_code_wrong', 'ru', 'Код неверный. Проверьте SMS и попробуйте ещё раз.'),
  ('web_code_wrong', 'ur', 'یہ کوڈ درست نہیں۔ پیغام دیکھ کر دوبارہ کوشش کریں۔'),
  ('web_code_expired', 'en', 'That code has expired. Send a new one.'),
  ('web_code_expired', 'es', 'Ese código venció. Pida uno nuevo.'),
  ('web_code_expired', 'fr', 'Ce code a expiré. Demandez-en un nouveau.'),
  ('web_code_expired', 'pt', 'Esse código expirou. Peça um novo.'),
  ('web_code_expired', 'zh', '验证码已过期，请重新发送。'),
  ('web_code_expired', 'ar', 'انتهت صلاحية هذا الرمز. اطلب رمزًا جديدًا.'),
  ('web_code_expired', 'hi', 'यह कोड समाप्त हो गया है। नया कोड मंगाएं।'),
  ('web_code_expired', 'bn', 'কোডটির মেয়াদ শেষ। নতুন কোড নিন।'),
  ('web_code_expired', 'ru', 'Срок действия кода истёк. Запросите новый.'),
  ('web_code_expired', 'ur', 'اس کوڈ کی مدت ختم ہو گئی ہے۔ نیا کوڈ منگوائیں۔'),
  ('web_wait', 'en', 'Too many tries. Please wait a few minutes and try again.'),
  ('web_wait', 'es', 'Demasiados intentos. Espere unos minutos e inténtelo de nuevo.'),
  ('web_wait', 'fr', 'Trop de tentatives. Attendez quelques minutes et réessayez.'),
  ('web_wait', 'pt', 'Muitas tentativas. Aguarde alguns minutos e tente de novo.'),
  ('web_wait', 'zh', '尝试次数过多，请几分钟后再试。'),
  ('web_wait', 'ar', 'محاولات كثيرة جدًا. انتظر بضع دقائق ثم حاول مرة أخرى.'),
  ('web_wait', 'hi', 'बहुत अधिक प्रयास। कुछ मिनट रुककर फिर कोशिश करें।'),
  ('web_wait', 'bn', 'অনেকবার চেষ্টা হয়েছে। কয়েক মিনিট পরে আবার চেষ্টা করুন।'),
  ('web_wait', 'ru', 'Слишком много попыток. Подождите несколько минут и попробуйте снова.'),
  ('web_wait', 'ur', 'بہت زیادہ کوششیں۔ چند منٹ انتظار کر کے دوبارہ کوشش کریں۔'),
  ('web_busy', 'en', 'We can''t send texts right now. Please try again later.'),
  ('web_busy', 'es', 'No podemos enviar mensajes en este momento. Inténtelo más tarde.'),
  ('web_busy', 'fr', 'Nous ne pouvons pas envoyer de SMS pour le moment. Réessayez plus tard.'),
  ('web_busy', 'pt', 'Não podemos enviar mensagens agora. Tente mais tarde.'),
  ('web_busy', 'zh', '目前无法发送短信，请稍后再试。'),
  ('web_busy', 'ar', 'لا يمكننا إرسال الرسائل الآن. حاول لاحقًا.'),
  ('web_busy', 'hi', 'अभी हम संदेश नहीं भेज पा रहे हैं। कृपया बाद में कोशिश करें।'),
  ('web_busy', 'bn', 'এই মুহূর্তে বার্তা পাঠানো যাচ্ছে না। পরে আবার চেষ্টা করুন।'),
  ('web_busy', 'ru', 'Сейчас мы не можем отправлять SMS. Попробуйте позже.'),
  ('web_busy', 'ur', 'ابھی ہم پیغام نہیں بھیج سکتے۔ براہ کرم بعد میں کوشش کریں۔')
on conflict (key, lang) do nothing;

-- The form only takes numbers it can text: US and Canada.
update btw_prompts set text = 'Enter a US or Canadian mobile number with its area code, e.g. 714 555 0100.', updated_at = now() where key = 'web_phone_invalid' and lang = 'en';
update btw_prompts set text = 'Escriba un número de celular de EE. UU. o Canadá con el código de área, p. ej. 714 555 0100.', updated_at = now() where key = 'web_phone_invalid' and lang = 'es';
update btw_prompts set text = 'Saisissez un numéro de portable des États-Unis ou du Canada avec l''indicatif, p. ex. 714 555 0100.', updated_at = now() where key = 'web_phone_invalid' and lang = 'fr';
update btw_prompts set text = 'Digite um número de celular dos EUA ou do Canadá com o código de área, ex.: 714 555 0100.', updated_at = now() where key = 'web_phone_invalid' and lang = 'pt';
update btw_prompts set text = '请输入带区号的美国或加拿大手机号码，例如 714 555 0100。', updated_at = now() where key = 'web_phone_invalid' and lang = 'zh';
update btw_prompts set text = 'أدخل رقم جوال أمريكي أو كندي مع رمز المنطقة، مثل 714 555 0100.', updated_at = now() where key = 'web_phone_invalid' and lang = 'ar';
update btw_prompts set text = 'एरिया कोड के साथ अमेरिका या कनाडा का मोबाइल नंबर लिखें, जैसे 714 555 0100।', updated_at = now() where key = 'web_phone_invalid' and lang = 'hi';
update btw_prompts set text = 'এরিয়া কোডসহ যুক্তরাষ্ট্র বা কানাডার মোবাইল নম্বর লিখুন, যেমন 714 555 0100।', updated_at = now() where key = 'web_phone_invalid' and lang = 'bn';
update btw_prompts set text = 'Введите мобильный номер США или Канады с кодом региона, например 714 555 0100.', updated_at = now() where key = 'web_phone_invalid' and lang = 'ru';
update btw_prompts set text = 'ایریا کوڈ کے ساتھ امریکہ یا کینیڈا کا موبائل نمبر لکھیں، جیسے 714 555 0100۔', updated_at = now() where key = 'web_phone_invalid' and lang = 'ur';
