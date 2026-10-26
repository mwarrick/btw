# Prompts, languages and keywords

## Prompt text is data

- 123 keys, 1203 rows (as of 2026-10-24; read with `dbAll`) in `btw_prompt_keys`, with text per language in `btw_prompts`. Field order, validation and branching stay in code.
- Keys `menu_intro`, `menu_footer` and `menu_invalid` are English only (sent before a language is picked); so is `resources_url`.
- All 10 languages were switched on as of 2026-10-23. A language can only be switched on once every message has text in it.
- `lib/prompts.js`: English-only keys, quote straightening, placeholder checks, `loadPrompts()` for the engine. `lib/translate.js`: Google v2 behind `translate()` and `detect()`.
- Supabase returns at most 1000 rows per request; `btw_prompts` is past that, so whole-table reads use `dbAll()` (see `CLAUDE.md` tooling quirks).

## Prompt editor (`/admin#prompts`)

Working live against the real Supabase and Google Translate (login, loading prompts, Google drafts all confirmed in production).

- The user edits in English only. Once an English prompt is saved and newer than a translation (by `updated_at`), it shows Translate, which calls `api/admin/translate-all` to translate and **save** into every language that is on or started, then shows the results in a dialog. A translation that loses a `{placeholder}` is not saved.
- While viewing another language, each prompt's English box has **Edit English**: edit in place (same 160 cap) and **Save and translate** saves the English and runs `translate-all`, so a translation that runs long is fixed by shortening the English without switching languages.
- Drafts made per language with "Draft with Google" are only saved when someone clicks Save.

## The 160-character cap

- Each prompt is capped at 160 characters (`PROMPT_MAX` in `lib/prompts.js`, mirrored in `admin.html`): the box stops typing there, `PUT /api/admin/prompts` refuses longer text, and `translate-all` doesn't save a translation that runs over.
- On 2026-10-23, 20 saved translations (none in English) were over the cap; the editor flags them as "too long" and lists them under "Only what needs work". All were fixed by the end of that day.
- Messages built from several prompts (menu, summary) can still run longer and go out as MMS.

## Languages (`/admin#languages`)

On/off, menu labels (each language's own name, e.g. Español, 中文), first-message preview.

## Keywords

Migration `20261024020000`.

- Every language's `kw_*` list was rewritten by hand to include each word its prompts tell people to type, plus everyday variants (machine translation had left e.g. Hindi yes as "हाँ क्यों", Arabic no as "غير", Chinese done as 完毕 while prompts say 完成).
- `normalize()` in `engine.js` also strips Chinese/Arabic/Urdu punctuation, « », curly quotes and Arabic vowel marks around an answer, so “是”。 or تخطَّ match.
- The same migration fixed "denomination" mistranslated as "face value"/"religion" and the Urdu baptism question that had yes/no reversed.
- English keywords always work too.
- **When a prompt names a word, its `kw_*` list must contain it.**

## Hand translations

- `lang_detected` and `kw_menu` (migration `20261023170000`) were translated by hand into all 10 languages; worth a native-speaker check.
- Wrong machine-translated labels (`sum_zip` as "zipper" in es/fr/zh/ar, `sum_state` as "status" in ru/zh) were fixed in migration `20261024000000`.
- The 12 longest signup prompts were shortened by hand in all 10 languages, keeping each language's keywords (migration `20261025120000`).
