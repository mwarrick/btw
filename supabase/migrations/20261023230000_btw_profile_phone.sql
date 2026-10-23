-- The pastor's page shows the phone the signup belongs to, read-only: it's
-- the number they texted from, and changing it isn't possible on the page.
-- Translations are by hand.
insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('web_phone', 'system', 'Signup page: label for their own phone number (shown, not editable).', '{}', 208),
  ('web_phone_hint', 'system', 'Signup page: under their phone number, saying it can''t be changed there.', '{}', 209)
on conflict (key) do nothing;

insert into btw_prompts (key, lang, text) values
  ('web_phone', 'en', 'Your phone number'),
  ('web_phone', 'es', 'Su número de teléfono'),
  ('web_phone', 'fr', 'Votre numéro de téléphone'),
  ('web_phone', 'pt', 'Seu número de telefone'),
  ('web_phone', 'zh', '您的电话号码'),
  ('web_phone', 'ar', 'رقم هاتفك'),
  ('web_phone', 'hi', 'आपका फ़ोन नंबर'),
  ('web_phone', 'ru', 'Ваш номер телефона'),
  ('web_phone', 'bn', 'আপনার ফোন নম্বর'),
  ('web_phone', 'ur', 'آپ کا فون نمبر'),
  ('web_phone_hint', 'en', 'The number you texted from. It can''t be changed here.'),
  ('web_phone_hint', 'es', 'El número desde el que nos escribió. No se puede cambiar aquí.'),
  ('web_phone_hint', 'fr', 'Le numéro depuis lequel vous nous avez écrit. Il ne peut pas être modifié ici.'),
  ('web_phone_hint', 'pt', 'O número de onde você nos enviou mensagem. Não pode ser alterado aqui.'),
  ('web_phone_hint', 'zh', '您发短信所用的号码，此处无法修改。'),
  ('web_phone_hint', 'ar', 'الرقم الذي راسلتنا منه. لا يمكن تغييره هنا.'),
  ('web_phone_hint', 'hi', 'जिस नंबर से आपने संदेश भेजा था। इसे यहाँ बदला नहीं जा सकता।'),
  ('web_phone_hint', 'ru', 'Номер, с которого вы нам писали. Здесь его изменить нельзя.'),
  ('web_phone_hint', 'bn', 'যে নম্বর থেকে আপনি বার্তা পাঠিয়েছেন। এটি এখানে পরিবর্তন করা যায় না।'),
  ('web_phone_hint', 'ur', 'وہ نمبر جس سے آپ نے پیغام بھیجا تھا۔ اسے یہاں تبدیل نہیں کیا جا سکتا۔')
on conflict (key, lang) do nothing;
