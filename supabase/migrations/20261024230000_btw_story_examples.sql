-- Testimonies: example stories on the writing page (/s/<key>, "See example
-- stories"), made up to show how the form's questions become a story. A
-- btw_guides text like the advice (key story_examples), edited on Testimonies
-- in /admin; English here, other languages from "Translate into every
-- language" (English shows until then).
insert into btw_guides (key, lang, body) values
  ('story_examples', 'en', '## Daniel
• **Before you were baptized, what was life like?** I worked all the time and worried about everything. I couldn''t sleep.
• **What made you decide to get baptized?** A coworker kept inviting me to his small group. I finally went, and they prayed for me by name. I wanted what they had.
• **What was the moment like, coming up out of the water?** I felt light, like I''d put down a bag I''d carried for years.
• **What would you say to someone who is thinking about it?** You don''t have to have it all together first. Just come as you are.
• **A verse that means something to you right now:** Matthew 11:28
**Daniel''s story:** I worked all the time and worried about everything. A coworker kept inviting me to his small group, and when I finally went, they prayed for me by name. Coming up out of the water, I felt like I''d put down a bag I''d carried for years. If you''re thinking about it, you don''t have to have it all together first. Come as you are.

## Ana
• **Before you were baptized, what was life like?** We had just moved to a new country. I was lonely and I didn''t know anyone.
• **What made you decide to get baptized?** A church near us brought food when my son was sick. They kept checking on us, and I started asking about Jesus.
• **What was the moment like, coming up out of the water?** My children were clapping. I cried. I knew I belonged to God and to a family.
• **What would you say to someone who is thinking about it?** Ask your questions. Nobody laughed at mine.
**Ana''s story:** We had just moved to a new country and I didn''t know anyone. When my son was sick, a church near us brought food and kept checking on us, and I started asking about Jesus. When I came up out of the water my children were clapping and I cried. I knew I belonged to God and to a family. Ask your questions: nobody laughed at mine.

## Josh
• **Before you were baptized, what was life like?** I was angry a lot, and I didn''t think God cared about me.
• **What made you decide to get baptized?** My youth leader listened to me. I read the story of the prodigal son and saw myself in it.
• **What was the moment like, coming up out of the water?** Everyone cheered. It felt like coming home.
• **What would you say to someone who is thinking about it?** God isn''t waiting for you to be good enough. He''s waiting for you to come home.
• **A verse that means something to you right now:** Luke 15:20
**Josh''s story:** I was angry a lot, and I didn''t think God cared about me. My youth leader listened, and when I read the story of the prodigal son, I saw myself in it. Coming up out of the water, everyone cheered, and it felt like coming home. God isn''t waiting for you to be good enough. He''s waiting for you to come home.

These are made up, to show how the questions become a story. Yours can be shorter, longer, or completely different.')
on conflict (key, lang) do nothing;

insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('story_examples', 'system', 'Testimony page: opens the example stories (their text is edited on Testimonies in /admin).', '{}', 820)
on conflict (key) do nothing;

insert into btw_prompts (key, lang, text) values
  ('story_examples', 'en', 'See example stories'),
  ('story_examples', 'es', 'Ver historias de ejemplo'),
  ('story_examples', 'fr', 'Voir des exemples d''histoires'),
  ('story_examples', 'pt', 'Ver histórias de exemplo'),
  ('story_examples', 'zh', '查看故事范例'),
  ('story_examples', 'ar', 'شاهد قصصًا كمثال'),
  ('story_examples', 'hi', 'उदाहरण कहानियाँ देखें'),
  ('story_examples', 'bn', 'উদাহরণ গল্প দেখুন'),
  ('story_examples', 'ru', 'Посмотреть примеры историй'),
  ('story_examples', 'ur', 'مثالی کہانیاں دیکھیں')
on conflict (key, lang) do nothing;
