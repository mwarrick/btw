-- The first 30 days: a new start no longer opens straight away. Its link is
-- texted to the phone given, the only way in, so the number is proven before
-- the church sees it (as when the same number starts again). The start page
-- says so.
insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('j_link_sent', 'system', '30 days start page: started; its link was texted to that phone, the only way in.', '{}', 872)
on conflict (key) do nothing;
insert into btw_prompts (key, lang, text) values
  ('j_link_sent', 'en', 'We''ve texted you a link. Open it to start Day 1.'),
  ('j_link_sent', 'es', 'Le enviamos un enlace por mensaje. Ábralo para empezar el día 1.'),
  ('j_link_sent', 'fr', 'Nous vous avons envoyé un lien par SMS. Ouvrez-le pour commencer le jour 1.'),
  ('j_link_sent', 'pt', 'Enviamos um link por mensagem. Abra-o para começar o dia 1.'),
  ('j_link_sent', 'zh', '我们已用短信把链接发给您。打开它，开始第1天。'),
  ('j_link_sent', 'ar', 'أرسلنا لك رابطًا برسالة. افتحه لتبدأ اليوم الأول.'),
  ('j_link_sent', 'hi', 'हमने आपको एक लिंक मैसेज किया है। दिन 1 शुरू करने के लिए उसे खोलें।'),
  ('j_link_sent', 'bn', 'আমরা আপনাকে একটি লিংক মেসেজ করেছি। দিন ১ শুরু করতে সেটি খুলুন।'),
  ('j_link_sent', 'ru', 'Мы отправили вам ссылку в сообщении. Откройте её, чтобы начать день 1.'),
  ('j_link_sent', 'ur', 'ہم نے آپ کو ایک لنک میسج کیا ہے۔ دن 1 شروع کرنے کے لیے اسے کھولیں۔')
on conflict (key, lang) do nothing;
