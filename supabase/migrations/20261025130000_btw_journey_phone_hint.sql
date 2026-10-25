-- The first 30 days: the phone box only shows after "My church may contact
-- me" is ticked, and then a number is needed, so its hint no longer says
-- "Optional".
update btw_prompts set text = 'So your church can reach you. Only your church will see it.', updated_at = now() where key = 'j_phone_hint' and lang = 'en';
update btw_prompts set text = 'Para que su iglesia pueda comunicarse con usted. Solo su iglesia lo verá.', updated_at = now() where key = 'j_phone_hint' and lang = 'es';
update btw_prompts set text = 'Pour que votre église puisse vous joindre. Seule votre église le verra.', updated_at = now() where key = 'j_phone_hint' and lang = 'fr';
update btw_prompts set text = 'Para que sua igreja possa falar com você. Só sua igreja verá.', updated_at = now() where key = 'j_phone_hint' and lang = 'pt';
update btw_prompts set text = '方便您的教会联系您。只有您的教会能看到。', updated_at = now() where key = 'j_phone_hint' and lang = 'zh';
update btw_prompts set text = 'لكي تتمكن كنيستك من التواصل معك. لن يراه إلا كنيستك.', updated_at = now() where key = 'j_phone_hint' and lang = 'ar';
update btw_prompts set text = 'ताकि आपका चर्च आपसे संपर्क कर सके। इसे केवल आपका चर्च देखेगा।', updated_at = now() where key = 'j_phone_hint' and lang = 'hi';
update btw_prompts set text = 'যাতে আপনার চার্চ আপনার সাথে যোগাযোগ করতে পারে। শুধু আপনার চার্চ দেখবে।', updated_at = now() where key = 'j_phone_hint' and lang = 'bn';
update btw_prompts set text = 'Чтобы ваша церковь могла с вами связаться. Увидит только ваша церковь.', updated_at = now() where key = 'j_phone_hint' and lang = 'ru';
update btw_prompts set text = 'تاکہ آپ کا چرچ آپ سے رابطہ کر سکے۔ صرف آپ کا چرچ دیکھے گا۔', updated_at = now() where key = 'j_phone_hint' and lang = 'ur';
