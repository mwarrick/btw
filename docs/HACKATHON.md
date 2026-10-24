# Baptize 2027: Share your story

**Track:** 2 Testimony sharing
**Team:** [names] · **Project Lead:** [name] · **Dev:** [name]

> We help people who were just baptized to tell their baptism story in their own words and post it, by a guided, phone-first web form in their language that turns their answers into a picture and a post they can share, while their church and the Baptize team see it only if they say yes.

## What we built

A self-serve story form for the newly baptized, in 10 languages: five short guided questions (typed or spoken) become their story, they choose who can read it (only them, their church, or their church and the Baptize team), and they leave with a ready-to-post picture and text. Nobody at the church has to produce anything; the church sees the stories shared with it, and the Baptize team can feature the ones shared with it.

## Demo

- **Live link:** https://baptize.app/story (also from the front page: *I was baptized* → *Share your story*).
- **Video walkthrough:** [to add]
- **How to try it in 60 seconds** (on a phone):
  1. Open a church's page and its **Stories** tab, and scan **Invite them to share their story** (or open `/story`, search *Grace* or another church, and enter a US or Canadian mobile number).
  2. Open the private link texted to you.
  3. Open **See example stories** if you want a model, then answer the questions (tap 🎤 to speak in Chrome). The answers fill in your story.
  4. Choose who can read it (under 18: a parent or guardian's name and OK), tick the consent box, **Save my story**.
  5. Tap the line you want on your picture, then **Share my story** (WhatsApp, Instagram, Facebook...) or **Copy the text**. Both carry #BaptizeTheWorld.
  6. In `/admin` → **Testimonies** (team login), stories shared with the team show up; **☆ Feature** one. Its writer's page now says *Featured by the team*.

  For a quick demo with no texting, `/admin` → Testimonies → **Add sample stories** loads the three made-up stories from the track's test data at a simulated church.

## Run it

```bash
# Node 20 or newer; no dependencies, no build step.
node dev/server.mjs
# Open http://localhost:8787/story (texts are printed to the console instead of sent)
# and http://localhost:8787/admin (setup password: pw, then add a user and log in).
```

`dev/server.mjs` runs every page and API handler against an in-memory database (`dev/fake-db.mjs`) with fake texting and a fake Google Translate, so nothing leaves your machine. To deploy for real, see the main [README](../README.md) (Vercel, Supabase, voip.ms).

## What works / what does not yet

- **Works:**
  - Guided questions in 10 languages, with speech input (Chrome) and example stories.
  - Three sharing levels with consent kept word for word, and the under-18 rule.
  - A story picture drawn in the browser, plus share, save and copy, with #BaptizeTheWorld.
  - The writer's own page: edit, change who can read, see status, delete.
  - The church's Stories tab with a printable QR code.
  - The team's screen: New / Mark read, Feature, English translation labeled as machine-made, sample stories.
  - All of it runs live at baptize.app.
- **Not yet:**
  - Video stories.
  - The parent or guardian approves on the same page (by name and a tick), not through a link of their own.
  - No notice to the writer when a story is featured; their page shows it.
  - Texting the private link reaches US and Canadian numbers only with our current provider (voip.ms). The form accepts any country's number, and only `lib/voipms.js` would change for another provider.
  - No AI rewriting: the questions and the line picker shape the story (our choice).
  - Translations of the advice and examples are Google drafts that need a native speaker's check.

## How it would plug into Baptize

- **Baptize action:** *save a story*.
  - When the team features a story the writer shared with them, `saveStory()` in `lib/baptize.js` hands it over in the shape Baptize's hand-made testimonies take: name, quote, story, language, church, place, verse and consent.
  - It's **mocked**: Baptize has no API yet, so it writes the payload to the Log panel. A real connection replaces only that file.
- **What fits Baptize's stack:** the same pieces Baptize already uses.
  - Vercel serverless functions and Supabase Postgres (tables prefixed `btw_`).
  - Plain HTML and JavaScript pages with no build step, which could become Next.js pages.
- **What Baptize would need to run it for real:**
  - An endpoint to receive featured stories.
  - A texting provider that reaches its countries (or WhatsApp later).
  - A native-speaker pass on the wording.

## Continue, hand off or stop?

[To decide.]

## If someone picks this up next

1. **Parent or guardian approval through their own link**, so an under-18's story waits for a real yes.
2. **A real `saveStory()`** once Baptize has an endpoint, and a note to the writer when their story is featured.
3. **A texting provider (or WhatsApp) that reaches Peru, Brazil and Asia**, and native-speaker checks of the translated wording.

Good to know:
- Story wording lives in the database (`btw_prompts`, edited in `/admin` → Settings → Prompts).
- The advice and example stories are edited in `/admin` → Testimonies.
- `CLAUDE.md` has the full map of the code.

## Credits

- [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4 by Kazuhiko Arase (MIT), in `public/js/qrcode.js`, for the church QR codes.
- Google Cloud Translation (v2) for language detection and translation drafts.
- Bible Gateway links for *Read it* in the first 30 days.
- The track's starter prompts and sample stories (FaithTech SoCal hackathon, `tracks/2-testimony-sharing/test-data`). The example stories (Daniel, Ana, Josh) are our own and made up.
- Built with [Claude Code](https://claude.com/claude-code).

## License

MIT. See [LICENSE](../LICENSE).
