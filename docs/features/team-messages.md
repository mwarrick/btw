# Conversations and team messages

## Conversations panel

`/admin#conversations`, `api/admin/conversations.js`.

- Lists every `btw_churches` row (newest activity first, status tabs, search) with where the person is from `btw_sessions`. Each row has a Message button that opens the conversation on its Messages tab.
- Clicking one opens its `btw_messages` thread as chat bubbles beside the saved answers. Unsent replies show dashed in red with the reason.
- Refresh buttons (no auto-refresh).
- A Delete button in the thread (`DELETE /api/admin/conversations?phone=`) removes the number's session, answers, texts, photos and logged problems so its next text starts fresh (useful for testing; deletes through the Supabase MCP tool time out).
- The dialog's title and Signup/Messages tabs stay pinned while the thread scrolls.

## Team messages

Migration `20261023180000`: `btw_messages.thread` 'signup' | 'team', `read_at`, `translation`.

- **Texting a pastor:** in a conversation's **Messages** tab a reviewer texts the pastor from the signup number (`POST /api/admin/conversations?phone=` `{ body }`; refused after STOP; `{ translate }` drafts the English into the pastor's signup language to check before sending). Team messages record `btw_messages.sent_by` and show "Sent by <name>". **Send login link** is next to Send (see [pastor-page.md](pastor-page.md#the-link)).
- **Pastor's replies:** once a signup has been completed (`completed_at`, even while an answer is being edited since), any text that isn't a command (the engine flags its fallback reply as `unhandled`) goes to the team thread unread, with Google's English translation (skipped when it only differs in curly vs straight quotes).
  - It also gets `info_reply` (what they can text: photos, a baptism count) at most once a day (migration `20261024050000`).
  - A number is instead their baptism count; see [baptism-counts.md](baptism-counts.md).
  - Pictures: see [photos.md](photos.md).
- **Mid-signup**, replies still go to the bot, so a reviewer who wants to talk presses **Finish signup** (tab row of the conversation, shown while a signup is unfinished; `POST /api/admin/conversations?phone=` `{ finish: true }`): it sets the session to `done` and the church to complete (with a page key), texts nothing, and from then on their free text goes to the team thread. Missing answers stay blank for Edit answers, and EDIT <n> still works.
- **Unread:** counts show on the list (Unread tab, "n new" chip) and on the Conversations tab; opening the conversation marks them read.
- Reviewers share the signup number; there's no open/close chat switch (decided).

## Text alerts

Migration `20261025110000`: `btw_users.alert_phone`; `lib/team-alerts.js`.

- A team member who adds a US/Canadian mobile number on the Users screen (Set up alerts, Test) gets a text from the signup number when a text goes to the team thread: "Baptize 2027: new message from <church or phone>: \"<first 70 characters, English translation when there is one>\" <site>/admin#open=<10 digits>" (the link opens that conversation's Messages tab).
- One alert per conversation until someone opens it (no other unread team message from that number); never for simulations; a failed alert is a `team-alert` warning.
- A text from an alert phone that has no signup isn't answered (logged `info` from `team-alert`).
- No email alerts (no email provider).
