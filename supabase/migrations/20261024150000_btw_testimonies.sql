-- Baptism testimonies (api/story.js, public/story.html, Testimonies in /admin):
-- a baptized person picks their church, verifies their phone through a
-- texted private link (/s/<key>) and writes their story; only the team and
-- that church read it. The advice shown beside the form is in btw_guides,
-- edited in /admin. Texts are limited like Get my link (kind 'story').
create table if not exists btw_testimonies (
  id            bigint generated always as identity primary key,
  phone         text not null unique,               -- +1XXXXXXXXXX, verified by the texted link
  church_id     uuid references btw_churches(id) on delete set null,
  lang          text not null default 'en',
  key           text not null unique,               -- the private link /s/<key>
  first_name    text,
  body          text,
  consent_text  text,                               -- story_consent in their language, as agreed
  consent_at    timestamptz,
  submitted_at  timestamptz,                        -- first save
  seen_at       timestamptz,                        -- opened in /admin since the last save
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists btw_testimonies_church_idx on btw_testimonies (church_id);
alter table btw_testimonies enable row level security;
create trigger btw_testimonies_updated_at before update on btw_testimonies for each row execute function btw_set_updated_at();

create table if not exists btw_guides (
  key         text not null,                        -- 'testimony'
  lang        text not null,
  body        text not null,                        -- "## " headings, "• " bullets, **bold**, blank lines between paragraphs
  updated_by  uuid references btw_users(id) on delete set null,
  updated_at  timestamptz not null default now(),
  primary key (key, lang)
);
alter table btw_guides enable row level security;
create trigger btw_guides_updated_at before update on btw_guides for each row execute function btw_set_updated_at();

alter table btw_web_requests drop constraint if exists btw_web_requests_kind_check;
alter table btw_web_requests add constraint btw_web_requests_kind_check check (kind in ('code', 'link', 'welcome', 'bot', 'story'));

insert into btw_guides (key, lang, body) values
  ('testimony', 'en', '## What is a baptism testimony?
A baptism testimony is a short, personal story that explains your relationship with Jesus Christ. It usually has three parts: Before, How and After you came to faith.

## The three parts
• **Before (your life before faith):** Describe what your life, mindset or struggles were like before you knew Jesus deeply, or what you were searching for to find peace and purpose.
• **How (coming to faith):** Share the specific moment, realization or period when you understood God''s grace, recognized your need for forgiveness, and trusted in Jesus'' death and resurrection.
• **After (your life now):** Explain how your daily life, priorities or inner peace have changed, and why you are choosing to be baptized as a public declaration of your faith.

## A sample testimony (under 1 minute)
"Before I came to know Christ, I tried to find my worth and peace in [work, control, the approval of others, or inner anxiety]. I felt like something was missing, and my own efforts left me exhausted.

Then God opened my eyes to His grace through [a specific verse, a friend''s example, or a moment of reflection]. I realized that I couldn''t fix my own brokenness, and that Jesus already paid the price for my sin on the cross. I surrendered my life to Him and asked for His forgiveness.

Now I don''t have to carry the weight of [struggle] on my own. I have a peace and a purpose that only come from Him. Today I am getting baptized to publicly declare that I belong to Jesus and to walk in the new life He has given me."

## Tips for writing your own
• **Keep it short:** aim for 1 to 2 minutes when spoken slowly (about 250 words or less).
• **Focus on Jesus:** keep the spotlight on God''s grace and rescue rather than on past mistakes.
• **Avoid religious jargon:** use simple, everyday language so that everyone, including people who don''t believe, can understand your story.'),
  ('testimony', 'es', '## ¿Qué es un testimonio de bautismo?
Un testimonio de bautismo es una historia breve y personal que explica su relación con Jesucristo. Suele tener tres partes: antes, cómo y después de llegar a la fe.

## Las tres partes
• **Antes (su vida antes de la fe):** Describa cómo eran su vida, su forma de pensar o sus luchas antes de conocer a Jesús de verdad, o qué buscaba para encontrar paz y propósito.
• **Cómo (llegar a la fe):** Cuente el momento, la comprensión o la etapa en que entendió la gracia de Dios, reconoció que necesitaba perdón y confió en la muerte y la resurrección de Jesús.
• **Después (su vida ahora):** Explique cómo han cambiado su vida diaria, sus prioridades o su paz interior, y por qué decide bautizarse como una declaración pública de su fe.

## Un ejemplo de testimonio (menos de 1 minuto)
"Antes de conocer a Cristo, intentaba encontrar mi valor y mi paz en [el trabajo, el control, la aprobación de los demás o mi ansiedad]. Sentía que me faltaba algo, y mis propios esfuerzos me dejaban agotado.

Entonces Dios me abrió los ojos a su gracia por medio de [un versículo, el ejemplo de un amigo o un momento de reflexión]. Entendí que no podía arreglar mi propio quebranto y que Jesús ya pagó el precio de mi pecado en la cruz. Le entregué mi vida y le pedí perdón.

Ahora no tengo que cargar solo con el peso de [mi lucha]. Tengo una paz y un propósito que solo vienen de Él. Hoy me bautizo para declarar públicamente que pertenezco a Jesús y para caminar en la nueva vida que Él me ha dado."

## Consejos para escribir el suyo
• **Sea breve:** procure que dure de 1 a 2 minutos dicho despacio (unas 250 palabras o menos).
• **Centre la atención en Jesús:** destaque la gracia y el rescate de Dios, no los errores del pasado.
• **Evite el lenguaje religioso:** use palabras sencillas y cotidianas para que todos, incluso quienes no creen, entiendan su historia.'),
  ('testimony', 'fr', '## Qu''est-ce qu''un témoignage de baptême ?
Un témoignage de baptême est un récit court et personnel qui explique votre relation avec Jésus-Christ. Il comporte généralement trois parties : avant, comment et après votre venue à la foi.

## Les trois parties
• **Avant (votre vie avant la foi) :** Décrivez ce qu''étaient votre vie, votre état d''esprit ou vos difficultés avant de vraiment connaître Jésus, ou ce que vous cherchiez pour trouver la paix et un sens à votre vie.
• **Comment (la venue à la foi) :** Racontez le moment, la prise de conscience ou la période où vous avez compris la grâce de Dieu, reconnu votre besoin de pardon et mis votre confiance dans la mort et la résurrection de Jésus.
• **Après (votre vie aujourd''hui) :** Expliquez comment votre quotidien, vos priorités ou votre paix intérieure ont changé, et pourquoi vous choisissez d''être baptisé(e) pour déclarer publiquement votre foi.

## Un exemple de témoignage (moins d''une minute)
« Avant de connaître le Christ, je cherchais ma valeur et la paix dans [le travail, le contrôle, l''approbation des autres ou mon anxiété]. Il me manquait quelque chose, et mes propres efforts m''épuisaient.

Puis Dieu m''a ouvert les yeux sur sa grâce à travers [un verset, l''exemple d''un ami ou un moment de réflexion]. J''ai compris que je ne pouvais pas réparer moi-même ce qui était brisé en moi, et que Jésus avait déjà payé le prix de mon péché sur la croix. Je lui ai donné ma vie et je lui ai demandé pardon.

Aujourd''hui, je n''ai plus à porter seul(e) le poids de [ma difficulté]. J''ai une paix et un but qui ne viennent que de lui. Je me fais baptiser pour déclarer publiquement que j''appartiens à Jésus et pour marcher dans la vie nouvelle qu''il m''a donnée. »

## Conseils pour écrire le vôtre
• **Soyez bref :** visez 1 à 2 minutes en parlant lentement (environ 250 mots ou moins).
• **Mettez Jésus au centre :** mettez en lumière la grâce et le secours de Dieu plutôt que les erreurs du passé.
• **Évitez le jargon religieux :** employez des mots simples de tous les jours pour que tout le monde, y compris les non-croyants, comprenne votre histoire.'),
  ('testimony', 'pt', '## O que é um testemunho de batismo?
Um testemunho de batismo é uma história curta e pessoal que explica o seu relacionamento com Jesus Cristo. Normalmente tem três partes: antes, como e depois de você chegar à fé.

## As três partes
• **Antes (sua vida antes da fé):** Descreva como eram sua vida, sua maneira de pensar ou suas lutas antes de conhecer Jesus de verdade, ou o que você buscava para encontrar paz e propósito.
• **Como (chegando à fé):** Conte o momento, a percepção ou o período em que você entendeu a graça de Deus, reconheceu sua necessidade de perdão e confiou na morte e na ressurreição de Jesus.
• **Depois (sua vida agora):** Explique como mudaram seu dia a dia, suas prioridades ou sua paz interior, e por que você escolhe ser batizado(a) como uma declaração pública da sua fé.

## Um exemplo de testemunho (menos de 1 minuto)
"Antes de conhecer a Cristo, eu tentava encontrar meu valor e minha paz [no trabalho, no controle, na aprovação dos outros ou na minha ansiedade]. Eu sentia que faltava alguma coisa, e meus próprios esforços me deixavam esgotado.

Então Deus abriu meus olhos para a sua graça por meio de [um versículo, o exemplo de um amigo ou um momento de reflexão]. Percebi que eu não conseguia consertar a minha própria fragilidade e que Jesus já tinha pagado o preço do meu pecado na cruz. Entreguei minha vida a Ele e pedi o seu perdão.

Agora não preciso carregar sozinho o peso de [minha luta]. Tenho uma paz e um propósito que só vêm dEle. Hoje estou sendo batizado para declarar publicamente que pertenço a Jesus e para andar na nova vida que Ele me deu."

## Dicas para escrever o seu
• **Seja breve:** procure falar de 1 a 2 minutos devagar (cerca de 250 palavras ou menos).
• **Mantenha o foco em Jesus:** destaque a graça e o resgate de Deus, e não os erros do passado.
• **Evite jargões religiosos:** use palavras simples do dia a dia para que todos, inclusive quem não crê, entendam sua história.'),
  ('testimony', 'zh', '## 什么是受洗见证？
受洗见证是一段简短的个人故事，讲述您与耶稣基督的关系。通常分为三部分：信主之前、如何信主、信主之后。

## 三个部分
• **之前（信主前的生活）：** 描述在真正认识耶稣之前，您的生活、想法或挣扎是怎样的，或者您曾经为寻找平安和人生意义而追求什么。
• **如何（信主的经过）：** 讲述您明白神的恩典、认识到自己需要赦免、并信靠耶稣的死与复活的那个时刻、领悟或阶段。
• **之后（现在的生活）：** 说明您的日常生活、优先次序或内心的平安有了怎样的改变，以及您为什么选择受洗，公开宣告您的信仰。

## 见证范例（1分钟以内）
“在认识基督之前，我试图在[工作、掌控、别人的认可或内心的焦虑]中寻找自己的价值和平安。我总觉得缺少了什么，靠自己的努力只让我筋疲力尽。

后来，神借着[一节经文、一位朋友的榜样或一次安静的反思]开启我的眼睛，让我看见祂的恩典。我明白自己无法修补内心的破碎，而耶稣已经在十字架上为我的罪付上了代价。我把生命交给祂，求祂赦免我。

现在，我不必独自背负[挣扎]的重担。我有了只有从祂而来的平安和目标。今天我受洗，是要公开宣告我属于耶稣，并要活出祂赐给我的新生命。”

## 写作小贴士
• **简短：** 慢慢说1到2分钟即可（约400字以内）。
• **以耶稣为中心：** 重点放在神的恩典和拯救上，而不是过去的错误。
• **避免宗教术语：** 用简单的日常用语，让每个人，包括不信主的人，都能听懂您的故事。'),
  ('testimony', 'ar', '## ما هي شهادة المعمودية؟
شهادة المعمودية قصة قصيرة وشخصية تشرح علاقتك بيسوع المسيح. وتتكوّن عادة من ثلاثة أجزاء: قبل الإيمان، وكيف آمنت، وبعد الإيمان.

## الأجزاء الثلاثة
• **قبل (حياتك قبل الإيمان):** صِف كيف كانت حياتك وطريقة تفكيرك أو صراعاتك قبل أن تعرف يسوع معرفة حقيقية، أو ما الذي كنت تبحث عنه لتجد السلام والمعنى.
• **كيف (الوصول إلى الإيمان):** شارك اللحظة أو الإدراك أو المرحلة التي فهمت فيها نعمة الله، وأدركت حاجتك إلى الغفران، ووثقت بموت يسوع وقيامته.
• **بعد (حياتك الآن):** اشرح كيف تغيّرت حياتك اليومية أو أولوياتك أو سلامك الداخلي، ولماذا اخترت أن تتعمّد إعلانًا علنيًا لإيمانك.

## مثال على شهادة (أقل من دقيقة)
"قبل أن أعرف المسيح، كنت أبحث عن قيمتي وسلامي في [العمل، أو السيطرة، أو رضا الآخرين، أو القلق الداخلي]. كنت أشعر أن شيئًا ما ينقصني، وكانت جهودي الخاصة تتركني منهكًا.

ثم فتح الله عينيّ على نعمته من خلال [آية معيّنة، أو مثال صديق، أو لحظة تأمل]. أدركت أنني لا أستطيع إصلاح انكساري بنفسي، وأن يسوع قد دفع بالفعل ثمن خطيتي على الصليب. فسلّمت له حياتي وطلبت غفرانه.

والآن لم أعد أحمل ثقل [الصراع] وحدي. لديّ سلام وهدف لا يأتيان إلا منه. واليوم أتعمّد لأعلن أمام الجميع أنني ليسوع، ولأسلك في الحياة الجديدة التي أعطاني إياها."

## نصائح لكتابة شهادتك
• **اجعلها قصيرة:** دقيقة إلى دقيقتين عند الكلام ببطء (نحو 250 كلمة أو أقل).
• **ركّز على يسوع:** اجعل الضوء على نعمة الله وخلاصه لا على أخطاء الماضي.
• **تجنّب المصطلحات الدينية:** استخدم لغة بسيطة يومية ليفهم الجميع قصتك، حتى من لا يؤمنون.'),
  ('testimony', 'hi', '## बपतिस्मा की गवाही क्या है?
बपतिस्मा की गवाही एक छोटी, निजी कहानी है जो यीशु मसीह के साथ आपके रिश्ते के बारे में बताती है। इसके आम तौर पर तीन हिस्से होते हैं: विश्वास से पहले, विश्वास तक कैसे पहुँचे, और विश्वास के बाद।

## तीन हिस्से
• **पहले (विश्वास से पहले का जीवन):** बताएँ कि यीशु को गहराई से जानने से पहले आपका जीवन, सोच या संघर्ष कैसे थे, या शांति और उद्देश्य पाने के लिए आप क्या खोज रहे थे।
• **कैसे (विश्वास तक पहुँचना):** वह पल, एहसास या समय बताएँ जब आपने परमेश्वर का अनुग्रह समझा, माना कि आपको क्षमा की ज़रूरत है, और यीशु की मृत्यु और पुनरुत्थान पर भरोसा किया।
• **बाद में (अब का जीवन):** बताएँ कि आपकी रोज़ की ज़िंदगी, प्राथमिकताएँ या मन की शांति कैसे बदली है, और आप अपने विश्वास की सार्वजनिक घोषणा के रूप में बपतिस्मा क्यों ले रहे हैं।

## गवाही का एक नमूना (1 मिनट से कम)
"मसीह को जानने से पहले, मैं अपनी कीमत और शांति [काम, नियंत्रण, दूसरों की स्वीकृति या मन की चिंता] में ढूँढने की कोशिश करता था। मुझे लगता था कि कुछ कमी है, और मेरी अपनी कोशिशें मुझे थका देती थीं।

फिर परमेश्वर ने [किसी खास वचन, किसी दोस्त के उदाहरण या सोच-विचार के एक पल] के ज़रिए मेरी आँखें अपने अनुग्रह के लिए खोलीं। मैंने समझा कि मैं अपने टूटेपन को खुद ठीक नहीं कर सकता, और यीशु क्रूस पर मेरे पाप की कीमत पहले ही चुका चुके हैं। मैंने अपना जीवन उन्हें सौंप दिया और उनसे क्षमा माँगी।

अब मुझे [संघर्ष] का बोझ अकेले नहीं उठाना पड़ता। मेरे पास वह शांति और उद्देश्य है जो सिर्फ़ उन्हीं से आता है। आज मैं बपतिस्मा ले रहा हूँ ताकि सबके सामने घोषणा करूँ कि मैं यीशु का हूँ, और उस नए जीवन में चलूँ जो उन्होंने मुझे दिया है।"

## अपनी गवाही लिखने के सुझाव
• **छोटा रखें:** धीरे बोलने पर 1 से 2 मिनट (लगभग 250 शब्द या कम)।
• **यीशु पर ध्यान रखें:** पुरानी गलतियों के बजाय परमेश्वर के अनुग्रह और उद्धार को आगे रखें।
• **धार्मिक शब्दजाल से बचें:** सरल, रोज़मर्रा की भाषा इस्तेमाल करें ताकि सब, विश्वास न करने वाले भी, आपकी कहानी समझ सकें।'),
  ('testimony', 'bn', '## বাপ্তিস্মের সাক্ষ্য কী?
বাপ্তিস্মের সাক্ষ্য হলো একটি ছোট, ব্যক্তিগত গল্প, যা যীশু খ্রীষ্টের সঙ্গে আপনার সম্পর্কের কথা বলে। সাধারণত এর তিনটি অংশ থাকে: বিশ্বাসের আগে, কীভাবে বিশ্বাসে এলেন, এবং বিশ্বাসের পরে।

## তিনটি অংশ
• **আগে (বিশ্বাসের আগের জীবন):** যীশুকে গভীরভাবে জানার আগে আপনার জীবন, চিন্তা বা সংগ্রাম কেমন ছিল, অথবা শান্তি ও উদ্দেশ্য পেতে আপনি কী খুঁজছিলেন, তা বলুন।
• **কীভাবে (বিশ্বাসে আসা):** সেই মুহূর্ত, উপলব্ধি বা সময়ের কথা বলুন যখন আপনি ঈশ্বরের অনুগ্রহ বুঝলেন, ক্ষমার প্রয়োজন স্বীকার করলেন, এবং যীশুর মৃত্যু ও পুনরুত্থানে বিশ্বাস রাখলেন।
• **পরে (এখনকার জীবন):** আপনার প্রতিদিনের জীবন, অগ্রাধিকার বা মনের শান্তি কীভাবে বদলেছে, এবং কেন আপনি বিশ্বাসের প্রকাশ্য ঘোষণা হিসেবে বাপ্তিস্ম নিচ্ছেন, তা ব্যাখ্যা করুন।

## একটি নমুনা সাক্ষ্য (1 মিনিটের কম)
"খ্রীষ্টকে জানার আগে আমি [কাজ, নিয়ন্ত্রণ, অন্যদের স্বীকৃতি বা মনের দুশ্চিন্তা]-র মধ্যে নিজের মূল্য ও শান্তি খুঁজতাম। মনে হতো কিছু একটা নেই, আর নিজের চেষ্টা আমাকে ক্লান্ত করে দিত।

তারপর ঈশ্বর [একটি নির্দিষ্ট পদ, এক বন্ধুর দৃষ্টান্ত বা চিন্তার একটি মুহূর্ত]-এর মাধ্যমে তাঁর অনুগ্রহের দিকে আমার চোখ খুলে দিলেন। আমি বুঝলাম, নিজের ভাঙন আমি নিজে সারাতে পারি না, আর যীশু ক্রুশে আমার পাপের মূল্য আগেই দিয়ে দিয়েছেন। আমি আমার জীবন তাঁর হাতে দিলাম এবং তাঁর কাছে ক্ষমা চাইলাম।

এখন আমাকে [সংগ্রাম]-এর বোঝা একা বইতে হয় না। আমার এমন শান্তি ও উদ্দেশ্য আছে যা কেবল তাঁর কাছ থেকেই আসে। আজ আমি বাপ্তিস্ম নিচ্ছি সবার সামনে ঘোষণা করতে যে আমি যীশুর, এবং তিনি আমাকে যে নতুন জীবন দিয়েছেন তাতে চলতে।"

## নিজের সাক্ষ্য লেখার পরামর্শ
• **সংক্ষিপ্ত রাখুন:** ধীরে বললে 1 থেকে 2 মিনিট (প্রায় 250 শব্দ বা কম)।
• **যীশুর ওপর মনোযোগ দিন:** অতীতের ভুলের চেয়ে ঈশ্বরের অনুগ্রহ ও উদ্ধারের কথা বেশি বলুন।
• **ধর্মীয় কঠিন শব্দ এড়িয়ে চলুন:** সহজ, প্রতিদিনের ভাষা ব্যবহার করুন, যাতে সবাই, অবিশ্বাসীরাও, আপনার গল্প বুঝতে পারেন।'),
  ('testimony', 'ru', '## Что такое свидетельство о крещении?
Свидетельство о крещении — это короткий личный рассказ о ваших отношениях с Иисусом Христом. Обычно в нём три части: до веры, как вы пришли к вере и после.

## Три части
• **До (жизнь до веры):** Расскажите, какой была ваша жизнь, образ мыслей или трудности до того, как вы по-настоящему узнали Иисуса, или что вы искали, чтобы обрести мир и смысл.
• **Как (приход к вере):** Расскажите о моменте, осознании или периоде, когда вы поняли Божью благодать, признали, что нуждаетесь в прощении, и доверились смерти и воскресению Иисуса.
• **После (жизнь сейчас):** Объясните, как изменились ваша повседневная жизнь, приоритеты или внутренний мир и почему вы решили креститься, чтобы открыто заявить о своей вере.

## Пример свидетельства (меньше минуты)
«До того как я узнал Христа, я пытался найти свою ценность и покой в [работе, контроле, одобрении других или внутренней тревоге]. Мне казалось, что чего-то не хватает, а мои собственные усилия только изматывали меня.

Потом Бог открыл мне глаза на Свою благодать через [конкретный стих, пример друга или минуту размышления]. Я понял, что не могу сам исцелить свою сломленность и что Иисус уже заплатил за мой грех на кресте. Я отдал Ему свою жизнь и попросил у Него прощения.

Теперь мне не нужно нести бремя [трудности] в одиночку. У меня есть мир и цель, которые приходят только от Него. Сегодня я крещусь, чтобы открыто заявить, что принадлежу Иисусу, и жить новой жизнью, которую Он мне дал».

## Советы, как написать своё
• **Будьте кратки:** 1–2 минуты, если говорить не спеша (примерно до 250 слов).
• **В центре — Иисус:** говорите о Божьей благодати и спасении, а не о прошлых ошибках.
• **Избегайте церковного жаргона:** говорите простыми, повседневными словами, чтобы вашу историю поняли все, в том числе неверующие.'),
  ('testimony', 'ur', '## بپتسمہ کی گواہی کیا ہے؟
بپتسمہ کی گواہی ایک مختصر اور ذاتی کہانی ہے جو یسوع مسیح کے ساتھ آپ کے تعلق کو بیان کرتی ہے۔ عام طور پر اس کے تین حصے ہوتے ہیں: ایمان سے پہلے، ایمان تک کیسے پہنچے، اور ایمان کے بعد۔

## تین حصے
• **پہلے (ایمان سے پہلے کی زندگی):** بتائیں کہ یسوع کو گہرائی سے جاننے سے پہلے آپ کی زندگی، سوچ یا مشکلات کیسی تھیں، یا سکون اور مقصد پانے کے لیے آپ کیا تلاش کر رہے تھے۔
• **کیسے (ایمان تک پہنچنا):** وہ لمحہ، احساس یا وقت بتائیں جب آپ نے خدا کا فضل سمجھا، معافی کی ضرورت کو مانا، اور یسوع کی موت اور جی اٹھنے پر بھروسا کیا۔
• **بعد میں (اب کی زندگی):** بتائیں کہ آپ کی روزمرہ زندگی، ترجیحات یا دل کا سکون کیسے بدلا ہے، اور آپ اپنے ایمان کے کھلے اعلان کے طور پر بپتسمہ کیوں لے رہے ہیں۔

## گواہی کا ایک نمونہ (1 منٹ سے کم)
"مسیح کو جاننے سے پہلے، میں اپنی قدر اور سکون [کام، اختیار، دوسروں کی منظوری یا اندرونی پریشانی] میں ڈھونڈنے کی کوشش کرتا تھا۔ مجھے لگتا تھا کہ کچھ کمی ہے، اور میری اپنی کوششیں مجھے تھکا دیتی تھیں۔

پھر خدا نے [کسی خاص آیت، کسی دوست کی مثال یا غور و فکر کے ایک لمحے] کے ذریعے میری آنکھیں اپنے فضل کی طرف کھول دیں۔ میں نے سمجھا کہ میں اپنی ٹوٹ پھوٹ خود ٹھیک نہیں کر سکتا، اور یسوع صلیب پر میرے گناہ کی قیمت پہلے ہی ادا کر چکے ہیں۔ میں نے اپنی زندگی ان کے سپرد کر دی اور ان سے معافی مانگی۔

اب مجھے [مشکل] کا بوجھ اکیلے نہیں اٹھانا پڑتا۔ میرے پاس وہ سکون اور مقصد ہے جو صرف انہی سے آتا ہے۔ آج میں بپتسمہ لے رہا ہوں تاکہ سب کے سامنے اعلان کروں کہ میں یسوع کا ہوں، اور اس نئی زندگی میں چلوں جو انہوں نے مجھے دی ہے۔"

## اپنی گواہی لکھنے کے مشورے
• **مختصر رکھیں:** آہستہ بولنے پر 1 سے 2 منٹ (تقریباً 250 الفاظ یا کم)۔
• **یسوع پر توجہ رکھیں:** ماضی کی غلطیوں کے بجائے خدا کے فضل اور نجات کو نمایاں کریں۔
• **مذہبی اصطلاحات سے بچیں:** سادہ، روزمرہ زبان استعمال کریں تاکہ سب، ایمان نہ رکھنے والے بھی، آپ کی کہانی سمجھ سکیں۔')
on conflict (key, lang) do nothing;

insert into btw_prompt_keys (key, section, description, placeholders, sort_order) values
  ('story_intro', 'system', 'Testimony pages: the line under the logo.', '{}', 300),
  ('story_church', 'system', 'Testimony pages: label of the church picker.', '{}', 301),
  ('story_church_hint', 'system', 'Testimony start page: under the church picker.', '{}', 302),
  ('story_church_none', 'system', 'Testimony start page: the search found no church.', '{}', 303),
  ('story_phone_hint', 'system', 'Testimony start page: under the phone box.', '{}', 304),
  ('story_send', 'system', 'Testimony start page: the button.', '{}', 305),
  ('story_sent', 'system', 'Testimony start page: after the button (the same whatever happened).', '{}', 306),
  ('story_link_text', 'system', 'Texted: the private link to write a testimony. Keep {link}.', '{link}', 307),
  ('story_title', 'system', 'Testimony pages: browser tab and heading.', '{}', 308),
  ('story_name', 'system', 'Testimony page: label of the first name box.', '{}', 309),
  ('story_body', 'system', 'Testimony page: label of the story box.', '{}', 310),
  ('story_body_hint', 'system', 'Testimony page: under the story label.', '{}', 311),
  ('story_consent', 'system', 'Testimony page: the box to tick before saving.', '{}', 312),
  ('story_save', 'system', 'Testimony page: the save button.', '{}', 313),
  ('story_saved', 'system', 'Testimony page: after saving.', '{}', 314),
  ('story_guide', 'system', 'Testimony page: heading of the advice (the text is edited on Testimonies in /admin).', '{}', 315),
  ('story_delete', 'system', 'Testimony page: the delete button.', '{}', 316),
  ('story_delete_confirm', 'system', 'Testimony page: asked before deleting.', '{}', 317),
  ('story_deleted', 'system', 'Testimony page: after deleting.', '{}', 318),
  ('web_tab_stories', 'system', 'Church page: the tab with their people''s baptism stories.', '{}', 319),
  ('web_stories_intro', 'system', 'Church page, Stories tab: the line at the top.', '{}', 320),
  ('web_no_stories', 'system', 'Church page, Stories tab: none yet.', '{}', 321),
  ('land_baptized_button', 'system', 'Front page: the button on the I was baptized card.', '{}', 322)
on conflict (key) do nothing;

insert into btw_prompts (key, lang, text) values
  ('story_intro', 'en', 'Share the story of your baptism. Only your church and the Baptize 2027 team will read it.'),
  ('story_intro', 'es', 'Comparta la historia de su bautismo. Solo su iglesia y el equipo de Baptize 2027 la leerán.'),
  ('story_intro', 'fr', 'Racontez l''histoire de votre baptême. Seuls votre église et l''équipe Baptize 2027 la liront.'),
  ('story_intro', 'pt', 'Conte a história do seu batismo. Somente sua igreja e a equipe do Baptize 2027 vão lê-la.'),
  ('story_intro', 'zh', '分享您的受洗故事。只有您的教会和 Baptize 2027 团队会阅读。'),
  ('story_intro', 'ar', 'شارك قصة معموديتك. لن يقرأها إلا كنيستك وفريق Baptize 2027.'),
  ('story_intro', 'hi', 'अपने बपतिस्मा की कहानी साझा करें। इसे केवल आपका चर्च और Baptize 2027 टीम पढ़ेगी।'),
  ('story_intro', 'bn', 'আপনার বাপ্তিস্মের গল্প বলুন। শুধু আপনার চার্চ ও Baptize 2027 দল এটি পড়বে।'),
  ('story_intro', 'ru', 'Расскажите историю своего крещения. Её прочитают только ваша церковь и команда Baptize 2027.'),
  ('story_intro', 'ur', 'اپنے بپتسمہ کی کہانی سنائیں۔ اسے صرف آپ کا چرچ اور Baptize 2027 ٹیم پڑھے گی۔'),
  ('story_church', 'en', 'The church that baptized you'),
  ('story_church', 'es', 'La iglesia donde se bautizó'),
  ('story_church', 'fr', 'L''église où vous avez été baptisé(e)'),
  ('story_church', 'pt', 'A igreja onde você foi batizado(a)'),
  ('story_church', 'zh', '为您施洗的教会'),
  ('story_church', 'ar', 'الكنيسة التي تعمّدت فيها'),
  ('story_church', 'hi', 'वह चर्च जहाँ आपका बपतिस्मा हुआ'),
  ('story_church', 'bn', 'যে চার্চে আপনার বাপ্তিস্ম হয়েছে'),
  ('story_church', 'ru', 'Церковь, где вы крестились'),
  ('story_church', 'ur', 'وہ چرچ جہاں آپ کا بپتسمہ ہوا'),
  ('story_church_hint', 'en', 'Type its name or city, then pick it from the list.'),
  ('story_church_hint', 'es', 'Escriba su nombre o ciudad y elíjala de la lista.'),
  ('story_church_hint', 'fr', 'Tapez son nom ou sa ville, puis choisissez-la dans la liste.'),
  ('story_church_hint', 'pt', 'Digite o nome ou a cidade e escolha na lista.'),
  ('story_church_hint', 'zh', '输入教会名称或城市，然后从列表中选择。'),
  ('story_church_hint', 'ar', 'اكتب اسمها أو مدينتها، ثم اخترها من القائمة.'),
  ('story_church_hint', 'hi', 'उसका नाम या शहर लिखें, फिर सूची से चुनें।'),
  ('story_church_hint', 'bn', 'নাম বা শহর লিখে তালিকা থেকে বেছে নিন।'),
  ('story_church_hint', 'ru', 'Введите название или город и выберите церковь из списка.'),
  ('story_church_hint', 'ur', 'اس کا نام یا شہر لکھیں، پھر فہرست سے منتخب کریں۔'),
  ('story_church_none', 'en', 'No church found. Try another spelling, or ask your church to sign up.'),
  ('story_church_none', 'es', 'No se encontró ninguna iglesia. Pruebe otra forma de escribirlo o pida a su iglesia que se inscriba.'),
  ('story_church_none', 'fr', 'Aucune église trouvée. Essayez une autre orthographe ou demandez à votre église de s''inscrire.'),
  ('story_church_none', 'pt', 'Nenhuma igreja encontrada. Tente outra grafia ou peça à sua igreja que se inscreva.'),
  ('story_church_none', 'zh', '未找到教会。请换一种写法，或请您的教会报名。'),
  ('story_church_none', 'ar', 'لم يتم العثور على كنيسة. جرّب كتابة أخرى، أو اطلب من كنيستك التسجيل.'),
  ('story_church_none', 'hi', 'कोई चर्च नहीं मिला। दूसरी वर्तनी आज़माएँ, या अपने चर्च से पंजीकरण करने को कहें।'),
  ('story_church_none', 'bn', 'কোনো চার্চ পাওয়া যায়নি। অন্য বানানে চেষ্টা করুন, বা আপনার চার্চকে নাম লেখাতে বলুন।'),
  ('story_church_none', 'ru', 'Церковь не найдена. Попробуйте другое написание или попросите свою церковь зарегистрироваться.'),
  ('story_church_none', 'ur', 'کوئی چرچ نہیں ملا۔ دوسرے ہجے آزمائیں، یا اپنے چرچ سے رجسٹر کرنے کو کہیں۔'),
  ('story_phone_hint', 'en', 'Your mobile number. We''ll text you a private link to write your story.'),
  ('story_phone_hint', 'es', 'Su número de celular. Le enviaremos por mensaje un enlace privado para escribir su historia.'),
  ('story_phone_hint', 'fr', 'Votre numéro de portable. Nous vous enverrons par SMS un lien privé pour écrire votre histoire.'),
  ('story_phone_hint', 'pt', 'Seu número de celular. Enviaremos por SMS um link privado para você escrever sua história.'),
  ('story_phone_hint', 'zh', '您的手机号码。我们会发短信给您一个私人链接，用来写下您的故事。'),
  ('story_phone_hint', 'ar', 'رقم جوالك. سنرسل إليك رابطًا خاصًا لكتابة قصتك.'),
  ('story_phone_hint', 'hi', 'आपका मोबाइल नंबर। कहानी लिखने के लिए हम आपको एक निजी लिंक भेजेंगे।'),
  ('story_phone_hint', 'bn', 'আপনার মোবাইল নম্বর। গল্প লেখার জন্য আমরা আপনাকে একটি ব্যক্তিগত লিংক পাঠাব।'),
  ('story_phone_hint', 'ru', 'Ваш мобильный номер. Мы пришлём SMS с личной ссылкой, чтобы написать вашу историю.'),
  ('story_phone_hint', 'ur', 'آپ کا موبائل نمبر۔ کہانی لکھنے کے لیے ہم آپ کو ایک نجی لنک بھیجیں گے۔'),
  ('story_send', 'en', 'Text me a link'),
  ('story_send', 'es', 'Envíenme un enlace'),
  ('story_send', 'fr', 'M''envoyer un lien'),
  ('story_send', 'pt', 'Enviar um link'),
  ('story_send', 'zh', '发送链接给我'),
  ('story_send', 'ar', 'أرسلوا لي رابطًا'),
  ('story_send', 'hi', 'मुझे लिंक भेजें'),
  ('story_send', 'bn', 'আমাকে লিংক পাঠান'),
  ('story_send', 'ru', 'Прислать ссылку'),
  ('story_send', 'ur', 'مجھے لنک بھیجیں'),
  ('story_sent', 'en', 'Check your texts: we sent you a private link to write your story.'),
  ('story_sent', 'es', 'Revise sus mensajes: le enviamos un enlace privado para escribir su historia.'),
  ('story_sent', 'fr', 'Consultez vos SMS : nous vous avons envoyé un lien privé pour écrire votre histoire.'),
  ('story_sent', 'pt', 'Confira suas mensagens: enviamos um link privado para você escrever sua história.'),
  ('story_sent', 'zh', '请查看短信：我们已发送一个私人链接，供您写下您的故事。'),
  ('story_sent', 'ar', 'تفقّد رسائلك: أرسلنا إليك رابطًا خاصًا لكتابة قصتك.'),
  ('story_sent', 'hi', 'अपने संदेश देखें: कहानी लिखने के लिए हमने आपको एक निजी लिंक भेजा है।'),
  ('story_sent', 'bn', 'আপনার বার্তা দেখুন: গল্প লেখার জন্য আমরা একটি ব্যক্তিগত লিংক পাঠিয়েছি।'),
  ('story_sent', 'ru', 'Проверьте SMS: мы прислали личную ссылку, чтобы написать вашу историю.'),
  ('story_sent', 'ur', 'اپنے پیغامات دیکھیں: کہانی لکھنے کے لیے ہم نے آپ کو ایک نجی لنک بھیجا ہے۔'),
  ('story_link_text', 'en', 'Write your baptism story here: {link}'),
  ('story_link_text', 'es', 'Escriba aquí la historia de su bautismo: {link}'),
  ('story_link_text', 'fr', 'Écrivez ici l''histoire de votre baptême : {link}'),
  ('story_link_text', 'pt', 'Escreva aqui a história do seu batismo: {link}'),
  ('story_link_text', 'zh', '在这里写下您的受洗故事：{link}'),
  ('story_link_text', 'ar', 'اكتب قصة معموديتك هنا: {link}'),
  ('story_link_text', 'hi', 'अपने बपतिस्मा की कहानी यहाँ लिखें: {link}'),
  ('story_link_text', 'bn', 'আপনার বাপ্তিস্মের গল্প এখানে লিখুন: {link}'),
  ('story_link_text', 'ru', 'Напишите историю своего крещения здесь: {link}'),
  ('story_link_text', 'ur', 'اپنے بپتسمہ کی کہانی یہاں لکھیں: {link}'),
  ('story_title', 'en', 'Your baptism story'),
  ('story_title', 'es', 'La historia de su bautismo'),
  ('story_title', 'fr', 'L''histoire de votre baptême'),
  ('story_title', 'pt', 'A história do seu batismo'),
  ('story_title', 'zh', '您的受洗故事'),
  ('story_title', 'ar', 'قصة معموديتك'),
  ('story_title', 'hi', 'आपके बपतिस्मा की कहानी'),
  ('story_title', 'bn', 'আপনার বাপ্তিস্মের গল্প'),
  ('story_title', 'ru', 'История вашего крещения'),
  ('story_title', 'ur', 'آپ کے بپتسمہ کی کہانی'),
  ('story_name', 'en', 'Your first name'),
  ('story_name', 'es', 'Su nombre'),
  ('story_name', 'fr', 'Votre prénom'),
  ('story_name', 'pt', 'Seu primeiro nome'),
  ('story_name', 'zh', '您的名字'),
  ('story_name', 'ar', 'اسمك الأول'),
  ('story_name', 'hi', 'आपका पहला नाम'),
  ('story_name', 'bn', 'আপনার নামের প্রথম অংশ'),
  ('story_name', 'ru', 'Ваше имя'),
  ('story_name', 'ur', 'آپ کا پہلا نام'),
  ('story_body', 'en', 'Your story'),
  ('story_body', 'es', 'Su historia'),
  ('story_body', 'fr', 'Votre histoire'),
  ('story_body', 'pt', 'Sua história'),
  ('story_body', 'zh', '您的故事'),
  ('story_body', 'ar', 'قصتك'),
  ('story_body', 'hi', 'आपकी कहानी'),
  ('story_body', 'bn', 'আপনার গল্প'),
  ('story_body', 'ru', 'Ваша история'),
  ('story_body', 'ur', 'آپ کی کہانی'),
  ('story_body_hint', 'en', 'In your own words, about 250 words or less.'),
  ('story_body_hint', 'es', 'Con sus propias palabras, unas 250 palabras o menos.'),
  ('story_body_hint', 'fr', 'Avec vos mots, environ 250 mots ou moins.'),
  ('story_body_hint', 'pt', 'Com suas palavras, cerca de 250 palavras ou menos.'),
  ('story_body_hint', 'zh', '用您自己的话，约400字以内。'),
  ('story_body_hint', 'ar', 'بكلماتك، نحو 250 كلمة أو أقل.'),
  ('story_body_hint', 'hi', 'अपने शब्दों में, लगभग 250 शब्द या कम।'),
  ('story_body_hint', 'bn', 'নিজের ভাষায়, প্রায় 250 শব্দ বা তার কম।'),
  ('story_body_hint', 'ru', 'Своими словами, примерно до 250 слов.'),
  ('story_body_hint', 'ur', 'اپنے الفاظ میں، تقریباً 250 الفاظ یا کم۔'),
  ('story_consent', 'en', 'I agree that my church and the Baptize 2027 team may read my story.'),
  ('story_consent', 'es', 'Acepto que mi iglesia y el equipo de Baptize 2027 lean mi historia.'),
  ('story_consent', 'fr', 'J''accepte que mon église et l''équipe Baptize 2027 lisent mon histoire.'),
  ('story_consent', 'pt', 'Concordo que minha igreja e a equipe do Baptize 2027 leiam minha história.'),
  ('story_consent', 'zh', '我同意我的教会和 Baptize 2027 团队阅读我的故事。'),
  ('story_consent', 'ar', 'أوافق على أن تقرأ كنيستي وفريق Baptize 2027 قصتي.'),
  ('story_consent', 'hi', 'मैं सहमत हूँ कि मेरा चर्च और Baptize 2027 टीम मेरी कहानी पढ़ सकते हैं।'),
  ('story_consent', 'bn', 'আমি সম্মত যে আমার চার্চ ও Baptize 2027 দল আমার গল্প পড়তে পারে।'),
  ('story_consent', 'ru', 'Я согласен(на), чтобы мою историю прочитали моя церковь и команда Baptize 2027.'),
  ('story_consent', 'ur', 'میں رضامند ہوں کہ میرا چرچ اور Baptize 2027 ٹیم میری کہانی پڑھ سکتی ہے۔'),
  ('story_save', 'en', 'Save my story'),
  ('story_save', 'es', 'Guardar mi historia'),
  ('story_save', 'fr', 'Enregistrer mon histoire'),
  ('story_save', 'pt', 'Salvar minha história'),
  ('story_save', 'zh', '保存我的故事'),
  ('story_save', 'ar', 'احفظ قصتي'),
  ('story_save', 'hi', 'मेरी कहानी सहेजें'),
  ('story_save', 'bn', 'আমার গল্প সংরক্ষণ করুন'),
  ('story_save', 'ru', 'Сохранить историю'),
  ('story_save', 'ur', 'میری کہانی محفوظ کریں'),
  ('story_saved', 'en', 'Saved. Thank you for sharing your story! You can come back to this link to change it.'),
  ('story_saved', 'es', 'Guardado. ¡Gracias por compartir su historia! Puede volver a este enlace para cambiarla.'),
  ('story_saved', 'fr', 'Enregistré. Merci d''avoir partagé votre histoire ! Revenez à ce lien pour la modifier.'),
  ('story_saved', 'pt', 'Salvo. Obrigado por compartilhar sua história! Volte a este link para alterá-la.'),
  ('story_saved', 'zh', '已保存。感谢您分享您的故事！您可以随时通过此链接修改。'),
  ('story_saved', 'ar', 'تم الحفظ. شكرًا لمشاركة قصتك! يمكنك العودة إلى هذا الرابط لتعديلها.'),
  ('story_saved', 'hi', 'सहेज लिया गया। अपनी कहानी साझा करने के लिए धन्यवाद! बदलने के लिए इसी लिंक पर लौटें।'),
  ('story_saved', 'bn', 'সংরক্ষিত হয়েছে। আপনার গল্প বলার জন্য ধন্যবাদ! বদলাতে এই লিংকে ফিরে আসুন।'),
  ('story_saved', 'ru', 'Сохранено. Спасибо, что поделились своей историей! Изменить её можно по этой же ссылке.'),
  ('story_saved', 'ur', 'محفوظ ہو گیا۔ اپنی کہانی سنانے کا شکریہ! تبدیل کرنے کے لیے اسی لنک پر واپس آئیں۔'),
  ('story_guide', 'en', 'How to share your story'),
  ('story_guide', 'es', 'Cómo contar su historia'),
  ('story_guide', 'fr', 'Comment raconter votre histoire'),
  ('story_guide', 'pt', 'Como contar sua história'),
  ('story_guide', 'zh', '如何分享您的故事'),
  ('story_guide', 'ar', 'كيف تشارك قصتك'),
  ('story_guide', 'hi', 'अपनी कहानी कैसे बताएं'),
  ('story_guide', 'bn', 'কীভাবে আপনার গল্প বলবেন'),
  ('story_guide', 'ru', 'Как рассказать свою историю'),
  ('story_guide', 'ur', 'اپنی کہانی کیسے سنائیں'),
  ('story_delete', 'en', 'Delete my story'),
  ('story_delete', 'es', 'Borrar mi historia'),
  ('story_delete', 'fr', 'Supprimer mon histoire'),
  ('story_delete', 'pt', 'Apagar minha história'),
  ('story_delete', 'zh', '删除我的故事'),
  ('story_delete', 'ar', 'احذف قصتي'),
  ('story_delete', 'hi', 'मेरी कहानी हटाएँ'),
  ('story_delete', 'bn', 'আমার গল্প মুছুন'),
  ('story_delete', 'ru', 'Удалить историю'),
  ('story_delete', 'ur', 'میری کہانی حذف کریں'),
  ('story_delete_confirm', 'en', 'Delete your story for good?'),
  ('story_delete_confirm', 'es', '¿Borrar su historia para siempre?'),
  ('story_delete_confirm', 'fr', 'Supprimer définitivement votre histoire ?'),
  ('story_delete_confirm', 'pt', 'Apagar sua história para sempre?'),
  ('story_delete_confirm', 'zh', '确定永久删除您的故事吗？'),
  ('story_delete_confirm', 'ar', 'هل تريد حذف قصتك نهائيًا؟'),
  ('story_delete_confirm', 'hi', 'क्या अपनी कहानी हमेशा के लिए हटाएँ?'),
  ('story_delete_confirm', 'bn', 'আপনার গল্প চিরতরে মুছে ফেলবেন?'),
  ('story_delete_confirm', 'ru', 'Удалить вашу историю навсегда?'),
  ('story_delete_confirm', 'ur', 'کیا اپنی کہانی ہمیشہ کے لیے حذف کریں؟'),
  ('story_deleted', 'en', 'Your story was deleted.'),
  ('story_deleted', 'es', 'Su historia fue borrada.'),
  ('story_deleted', 'fr', 'Votre histoire a été supprimée.'),
  ('story_deleted', 'pt', 'Sua história foi apagada.'),
  ('story_deleted', 'zh', '您的故事已删除。'),
  ('story_deleted', 'ar', 'تم حذف قصتك.'),
  ('story_deleted', 'hi', 'आपकी कहानी हटा दी गई।'),
  ('story_deleted', 'bn', 'আপনার গল্প মুছে ফেলা হয়েছে।'),
  ('story_deleted', 'ru', 'Ваша история удалена.'),
  ('story_deleted', 'ur', 'آپ کی کہانی حذف کر دی گئی۔'),
  ('web_tab_stories', 'en', 'Stories'),
  ('web_tab_stories', 'es', 'Historias'),
  ('web_tab_stories', 'fr', 'Histoires'),
  ('web_tab_stories', 'pt', 'Histórias'),
  ('web_tab_stories', 'zh', '见证'),
  ('web_tab_stories', 'ar', 'القصص'),
  ('web_tab_stories', 'hi', 'कहानियाँ'),
  ('web_tab_stories', 'bn', 'গল্প'),
  ('web_tab_stories', 'ru', 'Истории'),
  ('web_tab_stories', 'ur', 'کہانیاں'),
  ('web_stories_intro', 'en', 'Baptism stories written by people from your church.'),
  ('web_stories_intro', 'es', 'Historias de bautismo escritas por personas de su iglesia.'),
  ('web_stories_intro', 'fr', 'Récits de baptême écrits par des personnes de votre église.'),
  ('web_stories_intro', 'pt', 'Histórias de batismo escritas por pessoas da sua igreja.'),
  ('web_stories_intro', 'zh', '您教会的人写下的受洗故事。'),
  ('web_stories_intro', 'ar', 'قصص معمودية كتبها أشخاص من كنيستك.'),
  ('web_stories_intro', 'hi', 'आपके चर्च के लोगों द्वारा लिखी बपतिस्मा की कहानियाँ।'),
  ('web_stories_intro', 'bn', 'আপনার চার্চের মানুষের লেখা বাপ্তিস্মের গল্প।'),
  ('web_stories_intro', 'ru', 'Истории о крещении, написанные людьми из вашей церкви.'),
  ('web_stories_intro', 'ur', 'آپ کے چرچ کے لوگوں کی لکھی ہوئی بپتسمہ کی کہانیاں۔'),
  ('web_no_stories', 'en', 'No stories yet. People baptized at your church can share theirs at baptize.app/story.'),
  ('web_no_stories', 'es', 'Aún no hay historias. Las personas bautizadas en su iglesia pueden compartir la suya en baptize.app/story.'),
  ('web_no_stories', 'fr', 'Pas encore d''histoires. Les personnes baptisées dans votre église peuvent partager la leur sur baptize.app/story.'),
  ('web_no_stories', 'pt', 'Ainda não há histórias. Pessoas batizadas na sua igreja podem compartilhar a delas em baptize.app/story.'),
  ('web_no_stories', 'zh', '还没有故事。在您教会受洗的人可以在 baptize.app/story 分享。'),
  ('web_no_stories', 'ar', 'لا توجد قصص بعد. يمكن لمن تعمّدوا في كنيستك مشاركة قصصهم على baptize.app/story.'),
  ('web_no_stories', 'hi', 'अभी कोई कहानी नहीं। आपके चर्च में बपतिस्मा लेने वाले baptize.app/story पर अपनी कहानी साझा कर सकते हैं।'),
  ('web_no_stories', 'bn', 'এখনো কোনো গল্প নেই। আপনার চার্চে বাপ্তিস্ম নেওয়া মানুষেরা baptize.app/story-তে তাদের গল্প বলতে পারেন।'),
  ('web_no_stories', 'ru', 'Историй пока нет. Крестившиеся в вашей церкви могут поделиться своей на baptize.app/story.'),
  ('web_no_stories', 'ur', 'ابھی کوئی کہانی نہیں۔ آپ کے چرچ میں بپتسمہ لینے والے baptize.app/story پر اپنی کہانی سنا سکتے ہیں۔'),
  ('land_baptized_button', 'en', 'Share your story'),
  ('land_baptized_button', 'es', 'Compartir mi historia'),
  ('land_baptized_button', 'fr', 'Raconter mon histoire'),
  ('land_baptized_button', 'pt', 'Contar minha história'),
  ('land_baptized_button', 'zh', '分享我的故事'),
  ('land_baptized_button', 'ar', 'شارك قصتك'),
  ('land_baptized_button', 'hi', 'अपनी कहानी साझा करें'),
  ('land_baptized_button', 'bn', 'আপনার গল্প বলুন'),
  ('land_baptized_button', 'ru', 'Рассказать свою историю'),
  ('land_baptized_button', 'ur', 'اپنی کہانی سنائیں')
on conflict (key, lang) do nothing;
