# Baptism counts

Migration `20261024080000`. A church's total is `btw_churches.baptisms` (+ `baptisms_at`). The latest number counts.

## By text

After signup, a text that is a number is their baptism count (`readCount` in `lib/counts.js`):

- a number alone in any script's digits;
- a number word in en/es/pt/fr, such as "nove" or "treinta y cinco";
- one number with a baptism word in any of the 10 languages, such as "14 bautismos" or "今天14人受洗".
- Two numbers, like "14 at 10am", aren't a count.

The reply is `count_saved`.

- **Checking big jumps:** one over 1,000, or more than ten times (and 20 above) the last, waits in `baptisms_pending` / `baptisms_pending_at` for a YES within a day (`count_confirm`; NO: `count_not_saved`). This is checked before the photo YES/NO.
- Baptisms mentioned without a single number go to the team and get `count_ask` (migration `20261025090000`).
- Any other free text goes to the team thread (see [team-messages.md](team-messages.md)).

## On the pastor's page

The Baptisms tab (`#baptisms`, `PATCH /api/profile` `{ baptisms }`, a whole number 0 to 100000; prompts `web_tab_baptisms`, `web_baptisms_question`, `web_baptisms_hint`, `web_baptisms_updated`, `web_baptisms_invalid`).

## In /admin

- Reviewers see and change it in Edit answers ("Baptisms so far"; blank clears it; a change sets `baptisms_at` and the usual `edited_by`/`edited_at`), and it shows in the conversation's answers panel and on the Churches row.
- The Baptisms screen (`#baptisms`): every finished signup (and any church with a count) with its total and when it was reported, the grand total, sortable by church name or count (click the column title; churches without a count sort last). It refreshes itself every 10 seconds while it's the open screen and the browser tab is in view, and highlights a row whose count just changed.
- Simulated finished churches get a random count (5 to 50).
