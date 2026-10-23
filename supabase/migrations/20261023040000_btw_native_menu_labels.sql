-- Show each language in the SMS menu by its own name (Español, Français,
-- 中文, ...). Names outside the GSM-7 alphabet make the first message a
-- Unicode SMS (2 segments instead of 1); that's accepted so people can
-- find their language.

update btw_languages set menu_label = name;
