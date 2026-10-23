-- Languages, prompt keys and the English copy.
--
-- Only English is active: a language goes live in the SMS menu once its
-- prompts are translated and someone has checked them in the editor.
-- Menu labels avoid non-GSM characters, because one such character turns
-- the whole menu into a 70-character Unicode message.

insert into btw_languages (code, name, menu_label, menu_order, active) values
  ('en', 'English',   'English',   1,  true),
  ('es', 'Español',   'Espanol',   2,  false),
  ('fr', 'Français',  'Francais',  3,  false),
  ('pt', 'Português', 'Portugues', 4,  false),
  ('zh', '中文',       'Chinese',   5,  false),
  ('ar', 'العربية',    'Arabic',    6,  false),
  ('hi', 'हिन्दी',       'Hindi',     7,  false),
  ('ru', 'Русский',   'Russian',   8,  false),
  ('bn', 'বাংলা',      'Bengali',   9,  false),
  ('ur', 'اردو',       'Urdu',      10, false);

create temporary table btw_seed (
  key          text,
  section      text,
  description  text,
  placeholders text[],
  sort_order   int,
  en           text
);

insert into btw_seed values
  -- system ----------------------------------------------------------------
  ('menu_intro', 'system', 'First message: heading above the language list. Sent before a language is chosen, so only the English text is used.', '{}', 10,
   E'Baptize 2027 signup.\nReply with a number for your language:'),
  ('menu_footer', 'system', 'First message: line under the language list.', '{}', 20,
   '(reply STOP to opt out)'),
  ('menu_invalid', 'system', 'Reply when the language choice is not a number from the list.', '{}', 30,
   'Please reply with a number from the list to pick your language.'),
  ('welcome', 'system', 'Sent once the language is chosen, before the first question.', '{}', 40,
   'Welcome, and thank you for hosting! I''ll ask a few quick questions to sign up your church. Just reply one answer at a time - text HELP anytime.'),
  ('help', 'system', 'Reply to HELP.', '{}', 50,
   'Happy to help! Reply with your answer to the last question, EDIT and a number to change something (like EDIT 6), or DONE when the summary looks right.'),
  ('stop', 'system', 'Reply to STOP. Carriers require this opt-out.', '{}', 60,
   'You''re opted out and won''t get more messages. Reply START anytime to sign up again.'),
  ('stopped_reply', 'system', 'Reply to any other text from someone who has opted out.', '{}', 70,
   'You''re opted out. Reply START to sign up again.'),
  ('restart', 'system', 'Reply to RESTART, before the language menu is sent again.', '{}', 80,
   'Starting over - your previous answers are cleared.'),
  ('done', 'system', 'Sent when the church replies DONE to the summary.', '{}', 90,
   'You''re all set - thank you for hosting a Baptize 2027 location! We''ll be in touch soon. Text EDIT anytime to make changes.'),
  ('done_reply', 'system', 'Reply to other texts after the signup is finished.', '{}', 100,
   'You''re all signed up. Text EDIT and a number to change something, or RESTART to start fresh.'),
  ('edit_saved', 'system', 'Sent after an edited answer is saved, before the summary is sent again.', '{}', 110,
   'Got it, updated!'),
  ('edit_invalid', 'system', 'Reply to EDIT with a number that is not on the summary.', '{}', 120,
   'I can edit items 1-12. Reply EDIT and a number, like EDIT 6.'),
  ('summary_hint', 'system', 'Reply to anything other than DONE or EDIT while the summary is showing.', '{}', 130,
   'Reply DONE to finish, or EDIT and a number to fix something (like EDIT 6).'),

  -- fields: ask_ is the question, edit_ is the question when fixing an
  -- answer from the summary, err_ is the reply to an answer that fails
  -- validation ------------------------------------------------------------
  ('ask_name', 'fields', 'Question: the texter''s name.', '{}', 200,
   'First, what''s your name?'),
  ('edit_name', 'fields', 'Edit question: name.', '{}', 201,
   'Sure - what''s the correct name?'),
  ('err_name', 'fields', 'Invalid answer: name was empty.', '{}', 202,
   'I didn''t catch that - what''s your name?'),

  ('ask_email', 'fields', 'Question: email. {name} is the name they just gave.', '{name}', 210,
   'Thanks, {name}! What''s your email?'),
  ('edit_email', 'fields', 'Edit question: email.', '{}', 211,
   'What''s the correct email?'),
  ('err_email', 'fields', 'Invalid answer: not an email address.', '{}', 212,
   'That doesn''t look like an email. Try again, like name@church.org'),

  ('ask_church', 'fields', 'Question: church name.', '{}', 220,
   'Great. What''s the name of your church?'),
  ('edit_church', 'fields', 'Edit question: church name.', '{}', 221,
   'What''s the correct church name?'),
  ('err_church', 'fields', 'Invalid answer: church name was empty.', '{}', 222,
   'Please send your church''s name.'),

  ('ask_street', 'fields', 'Question: church street address.', '{}', 230,
   'What''s your church''s street address?'),
  ('edit_street', 'fields', 'Edit question: street address.', '{}', 231,
   'What''s the correct street address?'),
  ('err_street', 'fields', 'Invalid answer: street address was empty.', '{}', 232,
   'Please send the street address.'),

  ('ask_city', 'fields', 'Question: church city.', '{}', 240,
   'And the city?'),
  ('edit_city', 'fields', 'Edit question: city.', '{}', 241,
   'What''s the correct city?'),
  ('err_city', 'fields', 'Invalid answer: city was empty.', '{}', 242,
   'Please send the city.'),

  ('ask_state', 'fields', 'Question: church state.', '{}', 250,
   'Which state? (e.g. TX)'),
  ('edit_state', 'fields', 'Edit question: state.', '{}', 251,
   'What''s the correct state? (e.g. TX)'),
  ('err_state', 'fields', 'Invalid answer: not a US state.', '{}', 252,
   'I didn''t recognize that state. Send a 2-letter code like TX or the full name.'),

  ('ask_zip', 'fields', 'Question: church ZIP code.', '{}', 260,
   'ZIP code?'),
  ('edit_zip', 'fields', 'Edit question: ZIP code.', '{}', 261,
   'What''s the correct ZIP code?'),
  ('err_zip', 'fields', 'Invalid answer: not a 5-digit ZIP.', '{}', 262,
   'A ZIP is 5 digits, like 78701.'),

  ('ask_denom', 'fields', 'Question: denomination (optional).', '{}', 270,
   'What''s your denomination? (or reply SKIP)'),
  ('edit_denom', 'fields', 'Edit question: denomination.', '{}', 271,
   'What''s the correct denomination? (or SKIP)'),

  ('ask_website', 'fields', 'Question: church website (optional).', '{}', 280,
   'Have a church website? Send the link, or SKIP.'),
  ('edit_website', 'fields', 'Edit question: website.', '{}', 281,
   'What''s the correct website? (or SKIP)'),
  ('err_website', 'fields', 'Invalid answer: not a web address.', '{}', 282,
   'That doesn''t look like a web address. Send a link or SKIP.'),

  ('ask_contact', 'fields', 'Question: are they the main contact for baptisms? YES, or a name.', '{}', 290,
   'Are you the main contact for baptisms at your church? Reply YES - or send the name of the person who is.'),
  ('edit_contact', 'fields', 'Edit question: main contact.', '{}', 291,
   'Who''s the main contact? Reply YES if it''s you, or send their name.'),
  ('err_contact', 'fields', 'Invalid answer: main contact was empty.', '{}', 292,
   'Reply YES, or send the contact''s name.'),

  ('ask_contact_phone', 'fields', 'Question: the main contact''s mobile. Only asked when they named someone else. {contact} is that name.', '{contact}', 300,
   'Thanks! What''s {contact}''s mobile number?'),
  ('edit_contact_phone', 'fields', 'Edit question: the main contact''s mobile. {contact} is their name.', '{contact}', 301,
   'What''s {contact}''s mobile number?'),
  ('err_contact_phone', 'fields', 'Invalid answer: not a 10-digit US number.', '{}', 302,
   'That doesn''t look like a 10-digit US mobile number.'),

  ('ask_baptism', 'fields', 'Question: are baptisms at the church address? NO asks for a different address.', '{}', 310,
   'Will baptisms take place at your church''s address? Reply YES, or NO for a different place.'),
  ('edit_baptism', 'fields', 'Edit question: baptism location.', '{}', 311,
   'Baptisms at your church address? Reply YES, or NO for a different place.'),
  ('err_baptism', 'fields', 'Invalid answer: not YES or NO.', '{}', 312,
   'Please reply YES or NO.'),

  ('ask_b_street', 'fields', 'Question: baptism street address (only when baptisms are elsewhere).', '{}', 320,
   'No problem - what''s the baptism street address?'),
  ('err_b_street', 'fields', 'Invalid answer: baptism street address was empty.', '{}', 322,
   'Please send the baptism street address.'),
  ('ask_b_city', 'fields', 'Question: baptism city.', '{}', 330,
   'City for the baptism location?'),
  ('err_b_city', 'fields', 'Invalid answer: baptism city was empty.', '{}', 332,
   'Please send the city.'),
  ('ask_b_state', 'fields', 'Question: baptism state.', '{}', 340,
   'State? (e.g. TX)'),
  ('err_b_state', 'fields', 'Invalid answer: not a US state.', '{}', 342,
   'Send a 2-letter code like TX or the full name.'),
  ('ask_b_zip', 'fields', 'Question: baptism ZIP code.', '{}', 350,
   'ZIP code?'),
  ('err_b_zip', 'fields', 'Invalid answer: not a 5-digit ZIP.', '{}', 352,
   'A ZIP is 5 digits, like 78701.'),

  ('ask_map', 'fields', 'Question: list the church on the public map?', '{}', 360,
   'Would you like your church on the public Baptize map so people can find you? Reply YES or NO.'),
  ('edit_map', 'fields', 'Edit question: public map.', '{}', 361,
   'Show your church on the public map? Reply YES or NO.'),
  ('err_map', 'fields', 'Invalid answer: not YES or NO.', '{}', 362,
   'Please reply YES or NO.'),

  ('ask_consent', 'fields', 'Question: confirm taking part and agree to be contacted. Only YES finishes.', '{}', 370,
   'Last thing: can you confirm your church is taking part in Baptize 2027 and agree to be contacted about it? Reply YES.'),
  ('err_consent', 'fields', 'Invalid answer: anything but YES.', '{}', 372,
   'Reply YES to confirm and finish your signup.'),

  -- summary: the numbered list sent before DONE / EDIT -------------------
  ('sum_intro', 'summary', 'First line of the summary.', '{}', 400,
   'Here''s your signup - thank you!'),
  ('sum_name', 'summary', 'Label for item 1.', '{}', 401, 'Name'),
  ('sum_email', 'summary', 'Label for item 2.', '{}', 402, 'Email'),
  ('sum_church', 'summary', 'Label for item 3.', '{}', 403, 'Church'),
  ('sum_street', 'summary', 'Label for item 4.', '{}', 404, 'Address'),
  ('sum_city', 'summary', 'Label for item 5.', '{}', 405, 'City'),
  ('sum_state', 'summary', 'Label for item 6.', '{}', 406, 'State'),
  ('sum_zip', 'summary', 'Label for item 7.', '{}', 407, 'ZIP'),
  ('sum_denom', 'summary', 'Label for item 8.', '{}', 408, 'Denomination'),
  ('sum_website', 'summary', 'Label for item 9.', '{}', 409, 'Website'),
  ('sum_contact', 'summary', 'Label for item 10.', '{}', 410, 'Main contact'),
  ('sum_baptism', 'summary', 'Label for item 11.', '{}', 411, 'Baptism site'),
  ('sum_map', 'summary', 'Label for item 12.', '{}', 412, 'Public map'),
  ('val_you', 'summary', 'Item 10 value when the texter is the main contact.', '{}', 420, 'You'),
  ('val_same', 'summary', 'Item 11 value when baptisms are at the church.', '{}', 421, 'Same as church'),
  ('val_yes', 'summary', 'Yes, as a summary value.', '{}', 422, 'Yes'),
  ('val_no', 'summary', 'No, as a summary value.', '{}', 423, 'No'),
  ('sum_outro', 'summary', 'Last line of the summary.', '{}', 430,
   'Reply DONE if it all looks right, or EDIT and a number to fix anything (like EDIT 6).'),

  -- keywords: words the church can type, comma separated, any case.
  -- Each language adds its own; the English words always work too. ------
  ('kw_yes', 'keywords', 'Words meaning yes.', '{}', 500, 'YES,Y'),
  ('kw_no', 'keywords', 'Words meaning no.', '{}', 501, 'NO,N'),
  ('kw_skip', 'keywords', 'Words that skip an optional question.', '{}', 502, 'SKIP'),
  ('kw_edit', 'keywords', 'Command to fix an answer, followed by its number.', '{}', 503, 'EDIT'),
  ('kw_done', 'keywords', 'Command to finish from the summary.', '{}', 504, 'DONE'),
  ('kw_help', 'keywords', 'Command for help.', '{}', 505, 'HELP'),
  ('kw_restart', 'keywords', 'Command to start over.', '{}', 506, 'RESTART'),
  ('kw_start', 'keywords', 'Command to opt back in after STOP.', '{}', 507, 'START'),
  ('kw_stop', 'keywords', 'Extra opt-out words. STOP itself always works, even if removed here.', '{}', 508, 'STOP');

insert into btw_prompt_keys (key, section, description, placeholders, sort_order)
select key, section, description, placeholders, sort_order from btw_seed;

insert into btw_prompts (key, lang, text)
select key, 'en', en from btw_seed;

drop table btw_seed;
