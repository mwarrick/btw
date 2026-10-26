# Front page and "How it works"

## Front page (`public/index.html`, `/`)

Three ways in, in the browser's language (picker; wording `land_*`, migration `20261024120000`, from `GET /api/profile?part=landing`):

- **Church organizers:**
  - **Sign up your church** opens `/signup?lang=` (see [web-signup.md](web-signup.md)).
  - **Or text {number}** shows the `VOIPMS_DID` as an `sms:` link (see [sms-signup.md](sms-signup.md)).
  - **Get my link** (`POST /api/profile?part=link` `{ phone }`): a signed-up, not opted-out, not simulated number is texted `login_link`, at most once per 10 minutes, logged as an `info` event from `get-link`. The answer is the same either way, so it doesn't reveal who signed up. Limits are in [web-signup.md](web-signup.md#spam-protection).
- **I was baptized:** **Share your story** opens `/story?lang=` (see [testimonies.md](testimonies.md)).
- **Team:** `/admin` (see [admin.md](admin.md)).

## "How it works" (`public/features.html`, `/features`)

Linked under the front page's cards. A public page in English, static, describing everything for churches and for the newly baptized, plus languages and privacy, with phone screenshots (`public/img/how/*.jpg`, taken on the dev server with the live English wording and sample data; the text-signup one shows only the dev server's two languages). **Keep it in step when features change** (2026-10-25).

**In every language** (2026-10-25):

- A language picker (switched-on languages; `?lang=`, else the browser's language) swaps each piece of text marked `data-t` for its machine translation from `GET /api/profile?part=features&lang=`.
- `features()` reads the English from the live page itself, translates it once per language with `translateHtml()` in `lib/translate.js`, and keeps it in `btw_guides` key `features` with a hash of the English, so a changed page is translated again on its next view.
- A note says it's machine-translated. Only `<b>`, `<br>` and links to our own pages survive from the translation; the pictures stay English.
- The front page's link (`land_how_link`, migration `20261025180000`) carries the reader's language.
- New text on the page needs a `data-t` (numbered in order; the numbers only have to be unique).
