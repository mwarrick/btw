# Photos

## On the pastor's page

Migration `20261024030000`: private Storage bucket `btw-photos` (another app owns `photos`), table `btw_photos`, prompts `web_tab_*`, `web_photos_intro`, `web_consent`, `web_add_photos`, `web_consent_needed`, `web_uploading`, `web_uploaded`, `web_upload_failed`, `web_delete`, `web_delete_confirm`, `web_no_photos` hand-translated into all 10 languages.

- The page's Photos tab (`/p/<key>#photos`). The browser shrinks each photo to 2048 px plus a 480 px thumbnail, re-encoded as JPEG (drops location data), and uploads one at a time as base64 JSON to `api/profile-photos.js` (Vercel's 4.5 MB body limit; files over 3 MB are refused).
- Removing deletes the files and row for good (decided).
- `lib/storage.js` is Storage over fetch (upload, signed links, delete); `lib/photos.js` lists (signed links, 1 hour), saves and deletes.
- The Photos tab and the single-photo view say photos are shown for a limited time (`web_photos_temporary`).

## Permission: one choice per church

Migration `20261024070000`: `btw_churches.photos_allowed` true/false/null, `photos_allowed_at`, `photos_consent_text`. Not a per-upload checkbox.

- The Photos tab shows one button, **Opt in** (with the `web_consent` statement: photos may be shared publicly, incl. social media; a parent agrees for anyone under 18) until they allow it, then **Opt out** (with `web_opted_in`; asks `web_opt_out_confirm` first).
- `PATCH /api/profile-photos` `{ allow }` and a YES/NO to the texted `photo_ask` both call `setPhotoChoice` (`lib/photos.js`), which applies the choice to all their photos. New photos (uploaded or texted) follow it via `churchChoice`. `photo_ask` is only sent while the choice is null.
- Photos show `web_waiting_label` (no choice yet) or `web_not_shared_label` (opted out).
- The exact consent text in their language is saved (`consent_text`, `consent_at` on each photo).
- `web_consent_needed`, `web_photos_waiting` and `web_allow_sharing` are no longer used.

## Pictures by text (MMS in)

Migration `20261024010000`: `btw_messages.media text[]`.

- The callback URL ends with `&media={MEDIA}` (voip.ms fills in comma-separated attachment links; `parseQuery` takes everything after `media=` whole, since a link may contain `&`). Links are saved with the message (http(s) only, up to 10).
- voip.ms's own links (`https://voip.ms/media/<token>/media.jpeg`) download fine server-side but don't display in a browser, so a conversation shows our stored copies (`photos` on each message from `GET /api/admin/conversations?phone=`, signed links) as thumbnails that open full size; only a text with no stored copy falls back to its links ("Attachment n" when they don't load).
- A picture with no words while a question is open (signing up or changing an answer) gets `engine.again()`, the question repeated, instead of an error. After the signup is finished it goes to the team thread unread (no translation). Pictures with words: the words are the answer, the picture is kept.
- Each picture is also copied into `btw-photos` (migration `20261024040000`; `savePhotosFromText` in `lib/photos.js`, type sniffed from the bytes: JPEG/PNG/GIF/WebP up to 5 MB; anything else, or a link voip.ms won't serve, stays only as the link and is logged as a warning), `source = 'sms'`, waiting for permission.
- Once the signup is finished the bot texts `photo_ask` (share publicly incl. social media? everyone in it, or a parent, must agree; YES or NO): with the first picture of a batch (not again while photos are waiting), or right after finishing when pictures came during the signup.
- A YES/NO (`engine.yesNo`, in their language or English) in phase `done` while photos wait answers for all of them: YES sets `consent_at` and `consent_text` (the question and their reply), NO sets `declined_at` (kept, "Not for sharing" in /admin). The reply is `photo_yes` / `photo_no` with their page link (`#photos`). Any other YES goes to the team as before.
- Each texted photo after signup gets a receipt: `photo_received` linking to `/p/<key>#photo-<id>` (the page opens that photo large), or `photos_received` linking to `#photos` for several in one text.

## In /admin

- A Photos screen (all churches, newest first, "New" count on its tab until opened in the conversation) and a Photos tab in each conversation, both with Delete.
- Texted photos are labeled "By text" and "Awaiting permission" / "Not for sharing".
- Deleting a conversation or the simulations deletes their photos too.
- Not yet: sending pictures from /admin (open question 4 in [../voipms.md](../voipms.md)).
