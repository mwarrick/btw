# Workflows

The site's three journeys, from the front page (`/`) on. The details behind each step are in `docs/features/`. GitHub renders these diagrams; elsewhere, paste a block into https://mermaid.live.

1. [Churches](#1-churches): sign up, then keep their page up to date
2. [The baptized: sharing a story](#2-the-baptized-sharing-a-story)
3. [The newly baptized: the first 30 days](#3-the-newly-baptized-the-first-30-days)

## 1. Churches

A church signs up by text or on the web; either way it ends with a thank-you text that links to the church's own page. Details: [sms-signup](features/sms-signup.md), [web-signup](features/web-signup.md), [pastor-page](features/pastor-page.md), [photos](features/photos.md), [baptism-counts](features/baptism-counts.md), [team-messages](features/team-messages.md).

```mermaid
flowchart TD
  start([Pastor or church organizer]) --> front["Front page /"]
  front -->|Or text our number| text1[Any text to the number]
  front -->|Sign up your church| web["/signup form"]
  front -->|Get my link| getlink[Phone typed in] --> linktext[[login_link texted, if signed up]] --> page

  %% Signup by text
  subgraph SMS["Signup by text"]
    text1 --> detect{"Language detected?<br>4+ letters, 80% sure"}
    detect -->|yes| welcome[[lang_detected + welcome]]
    detect -->|no| menu[[Language menu]] --> pick[Replies with a number] --> welcome
    welcome --> formlink[["web_form_link: Or fill in one form: /p/key"]]
    formlink --> q[Questions one text at a time:<br>name, email, church, country...]
    q --> us{In the US?}
    us -->|YES| usq[State, 5-digit ZIP]
    us -->|other country| intl[Region, postal code<br>both SKIPpable]
    usq --> more[Denomination, website, contact,<br>baptism site, public map]
    intl --> more
    more --> consent["Last one: consent"]
  end

  formlink -.->|opens the link instead| finishweb["/p/key: finish on the web<br>answers so far + consent"]
  finishweb --> done
  consent --> done[[Thank-you: done + done_link to /p/key]]

  %% Signup on the web
  subgraph WEB["Signup on the web"]
    web --> check{"Answers valid?<br>US/Canada number?<br>bot? rate limit?"}
    check -->|ok| code[[6-digit code texted]]
    code --> enter[Code entered<br>10 min, 5 tries]
    enter --> saved[Signup saved]
  end
  saved --> done
  saved --> page

  done --> page["Church page /p/key<br>(the link is the login)"]

  %% After signup
  subgraph AFTER["After signup"]
    page --> tabs["Your signup: change any answer<br>Photos: Opt in / out, upload<br>Baptisms: count so far<br>Resources: Dropbox folder<br>Stories, Newly baptized: QR codes to invite"]
    later[Later texts from the church] --> kind{What is it?}
    kind -->|a number| count{Big jump?}
    count -->|no| countsaved[[count_saved]]
    count -->|"over 1,000 or 10x"| confirm[[count_confirm: YES within a day]]
    kind -->|a picture| pic[Photo stored] --> ask[["photo_ask: share publicly? YES/NO<br>(until the church has chosen)"]]
    kind -->|EDIT n / MENU / STOP / HELP| bot[Handled by the bot]
    kind -->|anything else| team[Team thread, unread,<br>English translation]
    team --> alert[[Text alert to team members<br>who turned it on]]
  end

  team --> admin["/admin: reviewer reads it,<br>replies by text, edits answers"]
  admin -->|reply from the signup number| later
```

## 2. The baptized: sharing a story

Anyone baptized can write their story. A texted link proves the phone, and the writer chooses who may read it. Details: [testimonies](features/testimonies.md).

```mermaid
flowchart TD
  start([Someone baptized]) --> entry{Comes from}
  entry -->|"Front page: Share your story"| story["/story"]
  entry -->|"Church's QR code"| storyc["/story?church=id<br>church already picked"]
  entry -->|"Day 27 of the 30 days"| story
  storyc --> form
  story --> form

  subgraph START["Start: /story"]
    form["Advice and example stories (folded)<br>Language, church search, phone"] --> can{"Phone valid and<br>textable (US/Canada)?<br>bot? rate limit?"}
    can -->|no| why[Explains why, nothing sent]
    can -->|yes| has{Story already<br>for this phone?}
    has -->|yes| same[[Same /s/key link texted again]]
    has -->|no| newlink[[New /s/key link texted]]
  end

  same --> write
  newlink --> write

  subgraph WRITE["Write: /s/key"]
    write["First name<br>5 guided questions (verse optional)<br>answers fill the story box"] --> who{Who can read it?}
    who -->|Only me| save
    who -->|My church| cons[Consent box]
    who -->|"My church and the Baptize 2027 team"| cons
    cons --> save[Save]
  end

  save --> firstsave{First save?}
  firstsave -->|yes| savedtext[[Link texted once more]]
  save --> minor{"Saved as under 18?<br>(age question hidden for now)"}
  minor -->|yes, and shared| parent["Parent's link /g/key<br>sent or texted by the writer"]
  parent --> approve{I approve / Not yet}
  approve -->|approve| readable
  approve -->|not yet| private[Stays private]
  minor -->|no| readable[Readable by who they chose]

  save --> card["Story picture 1080x1920:<br>Share / Save / Copy<br>(nothing sent to us)"]
  save --> journeybtn["Start my first 30 days<br>(see workflow 3)"]

  readable -->|church or team| churchtab["Church page: Stories tab<br>(read-only)"]
  readable -->|team| adminT["/admin Testimonies:<br>New, Mark read, English translation"]
  adminT --> feature["Feature"]
  feature --> feattext[["story_featured texted<br>(first time only)"]]
  feature --> baptize["Hand-off to baptize.org<br>(mocked: logged)"]

  write -.->|later visits| edit["Change it (asks the team / parent again)<br>or Delete my story (for good)"]
```

## 3. The newly baptized: the first 30 days

Online only, except one text carrying their link. A day opens each calendar day; check-ins reach their church if they allowed it. Details: [first-30-days](features/first-30-days.md).

```mermaid
flowchart TD
  start([Newly baptized]) --> entry{Comes from}
  entry -->|"Front page: First 30 days"| j["/journey"]
  entry -->|"Church's QR code (Newly baptized tab)"| jc["/journey?church=id<br>church picked, changeable"]
  entry -->|"Button on their saved story"| js["/journey?story=key<br>church, name and verified phone carried over"]

  subgraph START["Start: /journey"]
    j --> form
    jc --> form
    js --> form
    form["Language, church, first name, phone<br>My church may contact me (optional)<br>My church may see my progress (optional)"] --> again{Phone already<br>has a journey?}
    again -->|yes| resend[[Same /j/key link texted again]]
    again -->|no| begin[Journey starts today<br>in their time zone]
    begin --> linktext[[/j/key link texted]]
  end

  resend --> days
  linktext --> days

  subgraph CHURCH["Their church (if allowed)"]
    flag["Could use a call"] --> tab["Church page: Newly baptized tab<br>day, done count, last active, notes<br>phone if contact allowed"]
    tab --> talked[We talked]
    note["Weekly note"]
  end

  subgraph DAYS["The days: /j/key"]
    days["30 dots, today open<br>missed days stay open"] --> day["Passage + Read it link<br>note, question, step"]
    day --> donebtn[Done]
    donebtn --> next{Which day?}
    next -->|"7, 14, 21"| checkin{"Check-in"}
    next -->|"27"| storylink["Share your story<br>(workflow 2)"]
    next -->|"30"| last["Check-in + next step:<br>group, serve, class, unsure"]
    checkin -->|Going well| days
    next -->|other days| days
    checkin -->|"It's hard / I have a question + note"| flag
    last --> fin([Finished])
    days -.-> ics["Add a daily reminder<br>to my calendar (.ics)"]
  end

  days -.->|3 days without opening or checking in| flag
  checkin -.->|missed by 3 days| flag
  note -->|shown on top of every day| days

  tab -.-> adminD["/admin Discipleship:<br>totals, answers per check-in,<br>edit the 30 days"]
```
