# Baptize 2027: sign up, share, grow

A simple way for churches to join **Baptize 2027**, and for the people they baptize to share their story and take their first steps of faith, from any phone, in their own language.

Churches sign up whichever way suits them: **by text message**, answering one short question at a time, or **on a mobile-friendly web page**. Stories and the first 30 days are mobile-friendly web pages too.

**Live site:** [baptize.app](https://baptize.app) · **Diagrams of each journey:** [How it works](#how-it-works) below · **Screenshots:** [baptize.app/features](https://baptize.app/features)

<p>
  <img src="public/img/how/text-signup.jpg" width="200" alt="A church signing up by text, one question at a time">
  <img src="public/img/how/church-page.jpg" width="200" alt="A church's own page">
  <img src="public/img/how/story-page.jpg" width="200" alt="A baptism story page">
  <img src="public/img/how/first-30-days.jpg" width="200" alt="Day 1 of the first 30 days">
</p>

## Who it's for

**Churches.** A pastor signs up by simply texting our number and answering about 14 short questions, one text at a time, or by filling in one mobile-friendly form on the web. They get a private link to their church's own page, where they can change their answers, add photos of baptisms, report how many people they've baptized, and see how their newly baptized are doing.

**People who were baptized.** Anyone baptized can write their story with a few guided questions, choose who may read it, and make a picture of it to post themselves. They can also follow **the first 30 days**: a short reading, a question and one small step each day, with check-ins their church can see if they allow it.

**The Baptize 2027 team.** The team sees every signup, texts pastors back from the same number, reads the stories people chose to share with them, and edits the wording of every message.

## How it works

### Churches

A church signs up by text or on the web. Either way, the thank-you text links to the church's own page, which is the only login it needs.

```mermaid
flowchart LR
  pastor([Pastor]) --> how{Signs up}
  how -->|texts our number| lang[Language detected,<br>or picked from a menu]
  lang --> q[About 14 questions,<br>one text at a time]
  how -->|fills in a form online| code[Texted code<br>confirms the phone]
  code --> form[One form]
  q -.->|or finishes on the web| form
  q --> done[[Thank-you text<br>with the page link]]
  form --> done
  done --> page["The church's own page:<br>answers, photos, baptism count,<br>resources, QR codes to invite"]
  done -.->|after signup| later[Later texts]
  later --> kind{What is it?}
  kind -->|a number| count[Baptism count saved]
  kind -->|a picture| photo[Photo kept,<br>asks to share it]
  kind -->|anything else| team["Baptize 2027 team inbox<br>+ a text alert to the team"]
  team -->|reply by text| later
```

### The baptized: sharing a story

Anyone baptized can write their story. A link texted to their phone is how they get back to it, and they choose who may read it.

```mermaid
flowchart LR
  person([Someone baptized]) --> start["Story start page<br>(front page or church QR code)"]
  start --> link[[Link texted<br>to their phone]]
  link --> write["Their own story page:<br>five guided questions<br>become a story"]
  write --> who{Who can read it?}
  who -->|only me| mine[Private]
  who -->|my church| church[Church page:<br>Stories tab]
  who -->|church and the team| team["Baptize 2027 team<br>reads it, may feature it"]
  write --> card[Story picture<br>to post themselves]
  write --> next["Start the first 30 days"]
```

### The newly baptized: the first 30 days

Online, except one text with their link. A new day opens each day, and check-ins reach their church if they allowed it.

```mermaid
flowchart LR
  person([Newly baptized]) --> start["30 days start page<br>(front page, church QR code,<br>or their story)"]
  start --> link[[Link texted<br>to their phone]]
  link --> days["Their own 30 days page:<br>a reading, a question<br>and a step each day"]
  days --> checkin{"Check-in on<br>days 7, 14, 21, 30"}
  checkin -->|going well| days
  checkin -->|"it's hard / a question"| flag
  days -.->|quiet for 3 days| flag["Could use a call"]
  flag --> church["Church page:<br>Newly baptized tab"]
  church --> talked[We talked]
  checkin -->|day 30| next([Next step:<br>group, serve, class])
```

## In 10 languages

English, Spanish, French, Portuguese, Chinese, Arabic, Hindi, Bengali, Russian and Urdu. A church that texts in its own language is answered in it, and every page has a language picker. The team writes in English and translates with one click.

## Privacy

- **No passwords.** Every church page, story and 30-day page has its own private link, sent by text. The pages aren't listed in search engines.
- **People choose.** A story is read only by the people its writer chooses. Photos are shared only if the church agrees. A church sees a newly baptized person's phone number only if they agree.
- **Deleting is for good.** Stories and photos can be deleted at any time.
- **We never post for anyone.** Story pictures are made on the person's own phone, for them to share.
- Texting works with numbers in the US and Canada.

## Status

A working proof of concept, built in October 2026. The gaps we know about and kept on purpose are in [docs/gaps.md](docs/gaps.md).

## For developers

- [docs/setup.md](docs/setup.md): how it's built, settings, voip.ms setup and running it locally
- [docs/features/](docs/features/): what each feature does, in detail
- [docs/workflows.md](docs/workflows.md): step-by-step diagrams of the three journeys
- [docs/schema.md](docs/schema.md): the database

## License and credits

MIT ([LICENSE](LICENSE)). QR codes are drawn with [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) by Kazuhiko Arase (MIT license), copied unchanged to `public/js/qrcode.js`. "QR Code" is a registered trademark of DENSO WAVE INCORPORATED.
