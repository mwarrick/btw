// lib/simulations.js
// Ten made-up signups that show the whole flow in /admin: each pastor's
// texts run through the real engine with the live prompts (so the bot's
// replies are exactly what a real pastor would get), then reviewers and
// pastors trade follow-up messages, and some answers are edited as a result.
//
// Nothing here goes near voip.ms. The numbers are fictional (555-01xx), the
// rows are marked btw_churches.simulated, and /admin badges them and never
// texts them.

import { createEngine, newState } from "../public/js/engine.js";
import { deletePhotos } from "./photos.js";
import { addSampleJourneys, removeSampleJourneys } from "./journeys.js";
import { newProfileKey, profileUrl } from "./profile-link.js";
import { loadPrompts } from "./prompts.js";
import { db } from "./supabase.js";

// btw_churches columns the engine keeps in state.data under the same name
// (as in api/sms-inbound.js).
const ANSWER_COLUMNS = [
  "name", "email", "church_name", "country", "street", "city", "state", "zip",
  "denomination", "website", "contact_name", "contact_phone", "baptism_same",
  "baptism_street", "baptism_city", "baptism_state", "baptism_zip", "public_map",
];

// Each scenario:
//   phone      fictional number
//   daysAgo    when the first text came in
//   lang       the language Google would detect in the first text, or null for the menu
//   texts      what the pastor texts, in order; the first one starts the conversation
//   followUps  [who, text, english?]: who is "team" (a reviewer) or "pastor";
//              english is the translation shown under a pastor's reply
//   edits      answers a reviewer changed after the follow-ups
//   unread     leave the pastor's last follow-up unread
export const SCENARIOS = [
  {
    // A clean signup with a typo in the email, found when the welcome email bounced.
    phone: "+19165550101", daysAgo: 9, lang: "en",
    texts: [
      "Hi! We'd like to sign up Riverside Community Church for Baptize 2027",
      "Dan Whitaker", "pastor@riversidecc.ogr", "Riverside Community Church", "YES", "2150 River Plaza Dr",
      "Sacramento", "CA", "95833", "Non-denominational", "riversidecc.org", "YES", "YES", "YES", "YES",
    ],
    followUps: [
      ["team", "Hi Dan, this is Mark with Baptize 2027. Thanks for signing up Riverside! Our welcome email to pastor@riversidecc.ogr bounced. Is .ogr a typo?"],
      ["pastor", "Ha, yes! It's pastor@riversidecc.org. Sorry about that."],
      ["team", "Fixed. Thanks Dan!"],
    ],
    edits: { email: "pastor@riversidecc.org" },
  },
  {
    // Spanish, detected from the first text; baptisms at a park, then the exact entrance.
    phone: "+17135550102", daysAgo: 8, lang: "es",
    texts: [
      "Hola, queremos inscribir nuestra iglesia en Baptize 2027",
      "Rosa Martínez", "rosa@nuevavidahouston.org", "Iglesia Nueva Vida", "Sí", "8800 Long Point Rd", "Houston", "Texas", "77055",
      "Pentecostal", "SALTAR", "Sí", "NO", "3500 Eldridge Pkwy", "Houston", "TX", "77084", "Sí", "Sí",
    ],
    followUps: [
      ["team", "Hola Rosa, soy Mark de Baptize 2027. ¿Los bautizos en el parque Bear Creek serán en el pabellón 4? Queremos poner la dirección exacta en el mapa."],
      ["pastor", "Sí, en el pabellón 4. La entrada correcta es 3535 War Memorial Dr, Houston 77084.",
        "Yes, at pavilion 4. The correct entrance is 3535 War Memorial Dr, Houston 77084."],
      ["team", "¡Gracias, Rosa! Ya lo actualizamos."],
    ],
    edits: { baptism_street: "3535 War Memorial Dr (Pavilion 4)" },
  },
  {
    // Chinese; someone else is the main contact, whose number turns out to be old.
    phone: "+14155550103", daysAgo: 8, lang: "zh",
    texts: [
      "你好，我们教会想报名参加 Baptize 2027",
      "陈约翰", "john.chen@sfcbc.org", "旧金山华人浸信会", "是的", "1255 Stockton St", "San Francisco", "CA", "94133",
      "浸信会", "sfcbc.org", "李牧师", "415-555-0188", "是的", "是的", "是的",
    ],
    followUps: [
      ["team", "陈弟兄您好，我是 Baptize 2027 的 Mark。李牧师的电话 415-555-0188 打不通，请问有其他号码吗？"],
      ["pastor", "李牧师换了新号码：415-555-0177。谢谢！", "Pastor Li has a new number: 415-555-0177. Thank you!"],
      ["team", "已更新，谢谢！"],
    ],
    edits: { contact_phone: "4155550177" },
  },
  {
    // Menu path with mistakes along the way: "USA" for the country, a
    // misspelled state, a short ZIP, "none" for the website, and an EDIT to
    // fix the church name after finishing.
    phone: "+15035550104", daysAgo: 7, lang: null,
    texts: [
      "Info?", "1",
      "Sarah O'Neil", "sarah@hopechapelpdx.org", "Hope Chapell", "USA", "4415 SE Belmont St", "Portland",
      "Oregan", "OR", "9721", "97215", "SKIP", "none", "SKIP", "YES", "YES", "NO", "YES",
      "EDIT 3", "Hope Chapel",
    ],
    followUps: [
      ["team", "Hi Sarah, Mark from Baptize 2027. You chose not to be on the public map, which is totally fine! Just checking: churches on the map usually get a few walk-ins. Want us to add you?"],
      ["pastor", "Our board talked it over. Yes, please add us!"],
      ["team", "Done. You're on the map now."],
    ],
    edits: { public_map: true },
  },
  {
    // Opts out partway through.
    phone: "+16025550105", daysAgo: 6, lang: "en",
    texts: ["Hello, I'm interested in the Baptize 2027 signup", "Mike Torres", "mtorres@example.com", "STOP"],
    followUps: [],
  },
  {
    // Stops answering partway through, so it stays in progress.
    phone: "+14045550106", daysAgo: 5, lang: null,
    texts: [
      "Hi", "1", "Rev. Angela Brooks", "abrooks@bethelame-atl.org", "Bethel AME Church", "YES", "220 Auburn Ave NE",
      "Atlanta", "GA", "30303", "AME", "SKIP",
    ],
    followUps: [],
  },
  {
    // Starts in English from the menu, switches to Spanish with MENU and
    // finishes there; a follow-up pins down the denomination.
    phone: "+13055550107", daysAgo: 5, lang: null,
    texts: [
      "Hi", "1", "Carlos Ruiz", "carlos@cristovivemiami.org", "MENU", "2",
      "Iglesia Cristo Vive", "SÍ", "1420 SW 8th St", "Miami", "FL", "33135", "Cristiana", "cristovivemiami.org",
      "SÍ", "SÍ", "SÍ", "SÍ",
    ],
    followUps: [
      ["team", "Hola Carlos, soy Mark de Baptize 2027. Pusiste \"Cristiana\" como denominación. ¿Son una iglesia independiente o pertenecen a alguna asociación?"],
      ["pastor", "Somos de las Asambleas de Dios.", "We're with the Assemblies of God."],
      ["team", "¡Perfecto, gracias Carlos!"],
    ],
    edits: { denomination: "Assemblies of God" },
  },
  {
    // Finished, then asks a question by text: it lands in Messages, unread.
    phone: "+16125550108", daysAgo: 3, lang: "en",
    texts: [
      "Hey, signing up New Life Fellowship for Baptize 2027",
      "Pastor Kim Larson", "kim@newlifemn.org", "New Life Fellowship", "YES", "3601 Nicollet Ave", "Minneapolis", "MN", "55409",
      "Evangelical Free", "newlifemn.org", "YES", "YES", "YES", "YES",
      "Quick question: do we need to provide our own baptism tank, or will one be provided?",
    ],
    followUps: [],
    unread: true,
  },
  {
    // Changes the street address by text with EDIT after finishing; a
    // reviewer then fixes the website.
    phone: "+14805550109", daysAgo: 4, lang: "en",
    texts: [
      "Signing up Grace Bible Church please",
      "Tom Becker", "tom@gracebibleaz.com", "Grace Bible Church", "YES", "1700 E Elliot Rd", "Tempe", "AZ", "85284",
      "Bible Church", "gracebibleaz.com", "YES", "YES", "YES", "YES",
      "EDIT 4", "1700 E Elliot Rd, Suite 4",
    ],
    followUps: [
      ["team", "Hi Tom, Mark here. Saw you updated your address, thanks! Is your website still gracebibleaz.com? The link isn't loading for us."],
      ["pastor", "We moved to gracebible.church last month."],
      ["team", "Updated. Thanks!"],
    ],
    edits: { website: "https://gracebible.church" },
  },
  {
    // An assistant signs up with the pastor as the main contact; the
    // follow-up moves baptisms to another campus.
    phone: "+16155550110", daysAgo: 2, lang: "en",
    texts: [
      "Hello! Signing up Cornerstone Church for Baptize 2027",
      "Megan Price", "megan@cornerstonenash.org", "Cornerstone Church", "YES", "5500 Nolensville Pike", "Nashville", "TN", "37211",
      "Baptist", "cornerstonenash.org", "Pastor James Holt", "615-555-0190", "YES", "YES", "YES",
    ],
    followUps: [
      ["team", "Hi Megan, Mark from Baptize 2027. Will baptisms be at the main campus on Nolensville Pike, or at the Franklin campus?"],
      ["pastor", "Good catch. We'll do them at the Franklin campus, it has the outdoor baptistry: 1100 Mallory Ln, Franklin TN 37067."],
      ["team", "Got it, we've updated your baptism location. Thanks Megan!"],
    ],
    edits: { baptism_same: false, baptism_street: "1100 Mallory Ln", baptism_city: "Franklin", baptism_state: "TN", baptism_zip: "37067" },
  },
  {
    // A church in Canada: a province and a postal code instead of a state
    // and ZIP, with a first try at the postal code that's too long.
    phone: "+14165550111", daysAgo: 1, lang: "en",
    texts: [
      "Hi, we're a church in Toronto. Can we join Baptize 2027?",
      "Grace Okafor", "grace@stjamesto.ca", "St. James Community Church", "Canada", "40 Elm St", "Toronto", "Ontario",
      "M5G 1H1 Canada", "M5G 1H1", "Anglican", "stjamesto.ca", "YES", "YES", "YES", "YES",
    ],
    followUps: [
      ["team", "Hi Grace, Mark from Baptize 2027. Great to have a church from Canada! Will baptisms be at the church, or at a lake or pool nearby?"],
      ["pastor", "At the church. We have a baptistry."],
    ],
  },
];

const MINUTE = 60 * 1000;

// Replaces any earlier simulations with fresh ones. `userId` is who the
// reviewers' messages and edits are credited to; `site` is the address for
// the pastors' page links. Returns how many were added.
export async function addSimulations(userId, site) {
  await removeSimulations();
  const { languages, prompts } = await loadPrompts();
  const engine = createEngine({ prompts, languages });
  const usable = SCENARIOS.filter((s) => !s.lang || languages.some((l) => l.code === s.lang));

  const churches = [];
  const sessions = [];
  const messages = [];
  for (const [i, s] of usable.entries()) {
    const out = run(engine, s, i, userId, site);
    churches.push(out.church);
    sessions.push(out.session);
    messages.push(...out.messages);
  }
  await db("btw_churches", { method: "POST", body: sameKeys(churches) });
  await db("btw_sessions", { method: "POST", body: sameKeys(sessions) });
  await db("btw_messages", { method: "POST", body: sameKeys(messages) });
  // Newly baptized people on their first 30 days, at the first church that
  // finished signing up, so its Newly baptized tab has someone to show.
  const finished = await db("btw_churches?simulated=eq.true&completed_at=not.is.null&select=id,phone");
  const first = usable.map((s) => finished.find((c) => c.phone === s.phone)).find(Boolean);
  await addSampleJourneys(first?.id);
  return usable.length;
}

// PostgREST wants every row of a bulk insert to have the same keys.
function sameKeys(rows) {
  const keys = [...new Set(rows.flatMap(Object.keys))];
  return rows.map((r) => Object.fromEntries(keys.map((k) => [k, r[k] ?? null])));
}

// Deletes every simulated signup with its texts, session, photos (someone
// may have tried the upload on a simulation's page) and logged problems.
export async function removeSimulations() {
  await removeSampleJourneys();
  const rows = await db("btw_churches?simulated=eq.true&select=phone");
  if (!rows.length) return 0;
  for (const r of rows) await deletePhotos({ phone: r.phone });
  const list = encodeURIComponent(`(${rows.map((r) => `"${r.phone}"`).join(",")})`);
  await Promise.all(["btw_sessions", "btw_messages", "btw_events"].map((t) => db(`${t}?phone=in.${list}`, { method: "DELETE" })));
  await db("btw_churches?simulated=eq.true", { method: "DELETE" });
  return rows.length;
}

// Plays one scenario through the engine, the way api/sms-inbound.js would.
function run(engine, s, index, userId, site) {
  const key = newProfileKey();
  // Spread over the day so the list doesn't look like a script ran it.
  let clock = Date.now() - s.daysAgo * 24 * 60 * MINUTE - (index % 5) * 97 * MINUTE;
  const at = (minutes) => { clock += minutes * MINUTE; return new Date(clock).toISOString(); };
  const messages = [];
  const text = (direction, body, extra = {}) =>
    messages.push({ phone: s.phone, direction, body, thread: "signup", created_at: at(direction === "in" ? 1 + (body.length % 3) : 0.1), ...extra });

  let state = newState();
  let completedAt = null;
  let consentAt = null;
  let lastSignupAt = null;
  for (const [n, message] of s.texts.entries()) {
    let result = engine.reply(state, message, { link: profileUrl(site, key) });
    if (n === 0 && result.state.phase !== "stopped") result = s.lang ? engine.startIn(s.lang) : engine.start();
    // A finished signup's free text is for the reviewers (see sms-inbound).
    if (completedAt && result.unhandled) {
      text("in", message, { thread: "team", read_at: s.unread ? null : at(0) });
      continue;
    }
    text("in", message);
    for (const reply of result.replies) text("out", reply);
    state = result.state;
    lastSignupAt = new Date(clock).toISOString();
    if (state.phase === "done" && !completedAt) completedAt = lastSignupAt;
    if (state.data.consent && !consentAt) consentAt = lastSignupAt;
  }

  // Follow-ups start the next day.
  if (s.followUps.length) at(18 * 60);
  for (const [who, body, english] of s.followUps) {
    if (who === "team") messages.push({ phone: s.phone, direction: "out", thread: "team", body, sent_by: userId, created_at: at(5) });
    else messages.push({ phone: s.phone, direction: "in", thread: "team", body, translation: english || null, created_at: at(40), read_at: at(20) });
  }

  const church = { phone: s.phone, lang: state.lang, simulated: true, profile_key: completedAt ? key : null };
  for (const col of ANSWER_COLUMNS) church[col] = state.data[col] ?? null;
  church.consent_at = consentAt;
  church.completed_at = state.phase === "lang" ? null : completedAt;
  church.status = state.phase === "stopped" ? "opted_out" : church.completed_at ? "complete" : "in_progress";
  // Finished churches report a made-up baptism count (5 to 50) some time
  // in the two days after finishing, never later than now.
  if (church.completed_at) {
    church.baptisms = 5 + Math.floor(Math.random() * 46);
    church.baptisms_at = new Date(Math.min(Date.now(), Date.parse(church.completed_at) + Math.random() * 2 * 24 * 60 * MINUTE)).toISOString();
  }
  church.created_at = messages[0].created_at;
  church.updated_at = lastSignupAt || church.created_at;
  if (s.edits) {
    Object.assign(church, s.edits);
    church.edited_by = userId;
    church.edited_at = at(2);
  }

  const session = {
    phone: s.phone, lang: state.lang, phase: state.phase, queue: state.queue, editing: state.editing,
    updated_at: church.updated_at,
  };
  return { church, session, messages };
}
