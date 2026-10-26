# The pastor's page (`/p/<key>`)

Migration `20261023220000`: `btw_churches.profile_key`, prompts `done_link` + `web_*` hand-translated into all 10 languages; `lib/profile-link.js`, `api/profile.js`, `public/profile.html`, rewrite `/p/:key` → `/profile` in `vercel.json` (not `/profile.html`: with `cleanUrls` that 404s).

## The link

- The finishing message ends with `done_link`, "See or update your signup anytime: https://btw-dusky.vercel.app/p/<key>" (88 characters in English; with the English `done` it's 141, one SMS).
- The key is 128 random bits (22 characters), made when the signup first finishes and kept, so the link never changes; signups finished before this got 32-hex keys from the migration. During a text signup it's made as soon as the language is picked (see [sms-signup.md](sms-signup.md#web-form-during-a-text-signup)).
- The link is the only login: it opens that one signup. Links don't expire and can't be revoked from `/admin` yet.
- Links use `https://baptize.app` (`SITE` in `lib/profile-link.js`; `PUBLIC_SITE_URL` overrides it; the dev server uses its own address).
- **Get my link** on the front page re-sends it (see [front-page.md](front-page.md)).
- **Send login link** (Messages tab in /admin, next to Send; `POST /api/admin/conversations?phone=` `{ sendLink: true }`) texts the pastor `login_link` ("Upload photos, change your profile, record baptism counts here: {link}", migration `20261024100000`; `done_link` where it's missing) with their link in their language, as a team message from the reviewer, making the key first if the signup has none (e.g. signups finished before links existed, or unfinished ones). Refused after STOP; saved but not texted for simulations.

## The page

- One small file (inline CSS/JS, system font, one API call). Its heading is the Baptize logo (`public/img/b-mark.avif`, 655 bytes, with a PNG fallback for browsers without AVIF); `web_title` only names the browser tab.
- Mobile-first, in the signup's language (labels and errors reuse `sum_*`, `val_*`, `err_*`; RTL for ar/ur), and checks answers with the same rules as `/admin` (`lib/church-fields.js`).
- The phone shows read-only under the email (`web_phone`, `web_phone_hint`, migration `20261023230000`); it's sent apart from the answers and never saved from the page.
- A pastor's save sets `edited_at` with `edited_by` empty, shown in `/admin` as "Edited … by the pastor". The conversation's answers panel in /admin shows the link (Pastor's page, opens in a new tab, as does the website) so a reviewer can resend it.
- For an unfinished text signup, the page is the "finish by web" form (see [sms-signup.md](sms-signup.md#web-form-during-a-text-signup)).
- Tabs: **Your signup**, **Photos** (`#photos`, [photos.md](photos.md)), **Baptisms** (`#baptisms`, [baptism-counts.md](baptism-counts.md)), **Resources** (`#resources`), plus **Newly baptized** and **Stories** ([first-30-days.md](first-30-days.md), [testimonies.md](testimonies.md)). They wrap to two rows on a phone.

## Your messages

Migration `20261024090000`. Under the signup form, a "Your messages" card with every text to and from the number, oldest first (`GET /api/profile?key=&part=messages`, latest 300; loaded after the page so the form shows first).

- Ours (bot and team alike) show as "Baptize 2027" (`web_from_us`), theirs as "You"; reviewers' names, translations and unsent replies aren't shown.
- A text that brought pictures has "Photo" links (`#photo-<id>`) that open that photo on the Photos tab.

## Resources

Migration `20261024060000`. A tab (`#resources`) with a button to the organizer's Dropbox folder, the same for every church. The link is the English-only prompt `resources_url` (editable on the Prompts screen); the tab hides without an http(s) link.
