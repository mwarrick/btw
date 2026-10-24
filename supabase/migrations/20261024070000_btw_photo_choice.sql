-- Photo permission belongs to the church, not to each upload: one choice,
-- shown on the pastor's page as a single Opt in / Opt out button, and set
-- by a YES/NO to the texted question too. photos_allowed: true (opted in;
-- every photo gets consent_at with photos_consent_text), false (opted out
-- or NO; photos get declined_at), null (not asked or not answered: texted
-- photos wait and the question is asked). Filled in from existing photos.
alter table btw_churches
  add column photos_allowed boolean,
  add column photos_allowed_at timestamptz,
  add column photos_consent_text text;

update btw_churches c set photos_allowed = true, photos_allowed_at = p.at, photos_consent_text = p.text
from (select distinct on (phone) phone, consent_at as at, consent_text as text
      from btw_photos where consent_at is not null order by phone, consent_at desc) p
where c.phone = p.phone
  and not exists (select 1 from btw_photos x where x.phone = c.phone and x.consent_at is null);
update btw_churches c set photos_allowed = false, photos_allowed_at = now()
where c.photos_allowed is null
  and exists (select 1 from btw_photos x where x.phone = c.phone and x.declined_at is not null)
  and not exists (select 1 from btw_photos x where x.phone = c.phone and x.consent_at is not null);

insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('web_opt_in', 'system', 'Signup page, Photos: button that allows sharing their photos publicly (shown with web_consent).', '{}', 723),
  ('web_opt_out', 'system', 'Signup page, Photos: button that withdraws permission to share their photos.', '{}', 724),
  ('web_opted_in', 'system', 'Signup page, Photos: shown once they''ve allowed sharing, above Opt out.', '{}', 725),
  ('web_opt_out_confirm', 'system', 'Signup page, Photos: asked before opting out.', '{}', 726),
  ('web_not_shared_label', 'system', 'Signup page, Photos: label on a photo that won''t be shared (they opted out or said NO).', '{}', 727)
on conflict (key) do nothing;

insert into btw_prompts (key, lang, text) values
  ('web_opt_in', 'en', 'Opt in'),
  ('web_opt_in', 'es', 'Aceptar'),
  ('web_opt_in', 'fr', 'Accepter'),
  ('web_opt_in', 'pt', 'Aceitar'),
  ('web_opt_in', 'zh', '同意'),
  ('web_opt_in', 'ar', 'موافقة'),
  ('web_opt_in', 'hi', 'सहमति दें'),
  ('web_opt_in', 'bn', 'সম্মতি দিন'),
  ('web_opt_in', 'ru', 'Согласиться'),
  ('web_opt_in', 'ur', 'اجازت دیں'),
  ('web_opt_out', 'en', 'Opt out'),
  ('web_opt_out', 'es', 'Retirar permiso'),
  ('web_opt_out', 'fr', 'Retirer l''autorisation'),
  ('web_opt_out', 'pt', 'Retirar permissão'),
  ('web_opt_out', 'zh', '撤回同意'),
  ('web_opt_out', 'ar', 'سحب الموافقة'),
  ('web_opt_out', 'hi', 'सहमति वापस लें'),
  ('web_opt_out', 'bn', 'সম্মতি প্রত্যাহার'),
  ('web_opt_out', 'ru', 'Отозвать согласие'),
  ('web_opt_out', 'ur', 'اجازت واپس لیں'),
  ('web_opted_in', 'en', 'You''ve allowed Baptize 2027 to share your photos publicly, including on social media.'),
  ('web_opted_in', 'es', 'Usted permitió que Baptize 2027 comparta sus fotos públicamente, incluso en redes sociales.'),
  ('web_opted_in', 'fr', 'Vous avez autorisé Baptize 2027 à partager vos photos publiquement, y compris sur les réseaux sociaux.'),
  ('web_opted_in', 'pt', 'Você permitiu que o Baptize 2027 compartilhe suas fotos publicamente, inclusive nas redes sociais.'),
  ('web_opted_in', 'zh', '您已允许 Baptize 2027 公开分享您的照片，包括在社交媒体上。'),
  ('web_opted_in', 'ar', 'لقد سمحت لـ Baptize 2027 بنشر صورك علنًا، بما في ذلك على وسائل التواصل الاجتماعي.'),
  ('web_opted_in', 'hi', 'आपने Baptize 2027 को अपनी फ़ोटो सोशल मीडिया सहित सार्वजनिक रूप से साझा करने की अनुमति दी है।'),
  ('web_opted_in', 'bn', 'আপনি Baptize 2027-কে আপনার ছবি সোশ্যাল মিডিয়াসহ প্রকাশ্যে শেয়ার করার অনুমতি দিয়েছেন।'),
  ('web_opted_in', 'ru', 'Вы разрешили Baptize 2027 публиковать ваши фото, в том числе в социальных сетях.'),
  ('web_opted_in', 'ur', 'آپ نے Baptize 2027 کو اپنی تصاویر سوشل میڈیا سمیت عوامی طور پر شیئر کرنے کی اجازت دی ہے۔'),
  ('web_opt_out_confirm', 'en', 'Stop sharing? Baptize 2027 won''t share your photos publicly.'),
  ('web_opt_out_confirm', 'es', '¿Dejar de compartir? Baptize 2027 no compartirá sus fotos públicamente.'),
  ('web_opt_out_confirm', 'fr', 'Arrêter le partage ? Baptize 2027 ne partagera pas vos photos publiquement.'),
  ('web_opt_out_confirm', 'pt', 'Parar de compartilhar? O Baptize 2027 não compartilhará suas fotos publicamente.'),
  ('web_opt_out_confirm', 'zh', '停止分享？Baptize 2027 将不会公开分享您的照片。'),
  ('web_opt_out_confirm', 'ar', 'إيقاف المشاركة؟ لن تنشر Baptize 2027 صورك علنًا.'),
  ('web_opt_out_confirm', 'hi', 'साझा करना बंद करें? Baptize 2027 आपकी फ़ोटो सार्वजनिक रूप से साझा नहीं करेगा।'),
  ('web_opt_out_confirm', 'bn', 'শেয়ার করা বন্ধ করবেন? Baptize 2027 আপনার ছবি প্রকাশ্যে শেয়ার করবে না।'),
  ('web_opt_out_confirm', 'ru', 'Отозвать согласие? Baptize 2027 не будет публиковать ваши фото.'),
  ('web_opt_out_confirm', 'ur', 'شیئرنگ بند کریں؟ Baptize 2027 آپ کی تصاویر عوامی طور پر شیئر نہیں کرے گا۔'),
  ('web_not_shared_label', 'en', 'Not shared'),
  ('web_not_shared_label', 'es', 'No se comparte'),
  ('web_not_shared_label', 'fr', 'Non partagée'),
  ('web_not_shared_label', 'pt', 'Não compartilhada'),
  ('web_not_shared_label', 'zh', '不分享'),
  ('web_not_shared_label', 'ar', 'غير مشاركة'),
  ('web_not_shared_label', 'hi', 'साझा नहीं'),
  ('web_not_shared_label', 'bn', 'শেয়ার নয়'),
  ('web_not_shared_label', 'ru', 'Не публикуется'),
  ('web_not_shared_label', 'ur', 'شیئر نہیں')
on conflict (key, lang) do nothing;
