// The signup conversation, shared by the demo page (in the browser) and the
// SMS handler (on the server). It is pure: give it the conversation state
// and one incoming text, and it returns the new state and the replies to
// send. It stores and sends nothing itself.
//
// Text comes from btw_prompts, passed in as:
//   prompts   { en: { ask_name: "...", ... }, es: { ... } }
//   languages the switched-on languages in menu order: [{ code, menu_label }]
// A prompt missing in a language falls back to English.
//
// State is plain JSON, so the server can keep it in btw_sessions:
//   { phase, lang, queue, editing, data }
// phase: "lang" | "collect" | "done" | "stopped" ("summary": a signup still
//        waiting on DONE from before the summary was dropped)
// queue: question ids still to ask; the first is the one awaiting an answer
// data:  answers, named like the btw_churches columns

export const US_STATES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia",
  FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois",
  IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
  MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada",
  NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York",
  NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
  WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

// Words carriers treat as opt-out / opt-in / help in every language.
const CARRIER_STOP = ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"];
const CARRIER_START = ["START", "UNSTOP"];
const CARRIER_HELP = ["HELP", "INFO"];
// Brings back the language menu. Built in because lang_detected promises it.
const MENU_WORDS = ["MENU"];

// ---------- answer checks ----------

const required = (text) => (text ? { value: text } : { error: true });

function usState(text) {
  const s = text.toUpperCase();
  if (US_STATES[s]) return { value: s };
  const abbr = Object.keys(US_STATES).find((a) => US_STATES[a].toUpperCase() === s);
  return abbr ? { value: abbr } : { error: true };
}

const zip = (text) => (/^\d{5}$/.test(text) ? { value: text } : { error: true });

// The US in names a pastor might type instead of YES; compared without
// accents, dots or spaces.
const US_NAMES = ["US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA", "AMERICA", "EEUU", "ESTADOS UNIDOS",
  "ETATS UNIS", "ESTADOS UNIDOS DA AMERICA", "美国", "美國", "الولايات المتحدة", "अमेरिका", "США", "যুক্তরাষ্ট্র", "امریکہ"];
const squash = (t) => normalize(t).replace(/[.\s-]/g, "");
const US_SET = new Set(US_NAMES.map(squash));

// A country as stored: "US", or the name as typed (lowercase Latin
// capitalized, "canada" -> "Canada"). Null for an empty answer.
export function countryValue(text) {
  const t = String(text ?? "").trim();
  if (!t) return null;
  if (US_SET.has(squash(t))) return "US";
  return /^[a-z\s.'-]+$/.test(t) ? t.replace(/(^|[\s-])[a-z]/g, (c) => c.toUpperCase()) : t;
}

// Signups from before the country question have none: those are US.
export const isUS = (data) => !data.country || data.country === "US";

// Outside the US: any state, province or region, or SKIP; a postal code of
// letters, digits, spaces and dashes, or SKIP (some countries have none).
const region = (text, w) => (w.is(text, "kw_skip") ? { value: null } : required(text));
function postal(text, w) {
  if (w.is(text, "kw_skip")) return { value: null };
  return /^[a-z0-9][a-z0-9 -]{1,9}$/i.test(text) ? { value: text.toUpperCase() } : { error: true };
}
const stateFor = (text, w) => (isUS(w.data) ? usState(text) : region(text, w));
const zipFor = (text, w) => (isUS(w.data) ? zip(text) : postal(text, w));

function phone(text) {
  let d = text.replace(/\D/g, "");
  if (d.length === 11 && d[0] === "1") d = d.slice(1);
  return d.length === 10 ? { value: d } : { error: true };
}

// Each question has prompts ask_<id>, edit_<id> (when fixing it with
// EDIT <n>) and err_<id> (when the answer doesn't pass `check`).
const STEPS = {
  name: { check: required, save: (d, v) => { d.name = v; } },
  email: {
    check: (t) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? { value: t } : { error: true }),
    save: (d, v) => { d.email = v; },
  },
  church: { check: required, save: (d, v) => { d.church_name = v; } },
  country: {
    // YES means the US; NO alone isn't a country.
    check: (t, w) => (w.is(t, "kw_yes") ? { value: "US" } : w.is(t, "kw_no") || !t ? { error: true } : { value: countryValue(t) }),
    save: (d, v) => { d.country = v; },
  },
  street: { check: required, save: (d, v) => { d.street = v; } },
  city: { check: required, save: (d, v) => { d.city = v; } },
  state: { check: stateFor, save: (d, v) => { d.state = v; } },
  zip: { check: zipFor, save: (d, v) => { d.zip = v; } },
  denom: {
    check: (t, w) => ({ value: w.is(t, "kw_skip") ? null : t || null }),
    save: (d, v) => { d.denomination = v; },
  },
  website: {
    check(t, w) {
      if (w.is(t, "kw_skip")) return { value: null };
      if (!/\.[a-z]{2,}/i.test(t) || /\s/.test(t)) return { error: true };
      return { value: /^https?:\/\//i.test(t) ? t : "https://" + t };
    },
    save: (d, v) => { d.website = v; },
  },
  contact: {
    // YES means the texter is the main contact; anything else is a name.
    check: (t, w) => (!t ? { error: true } : { value: w.is(t, "kw_yes") ? null : t }),
    save(d, v) {
      d.contact_name = v;
      if (!v) d.contact_phone = null;
    },
    next: (v) => (v ? ["contact_phone"] : []),
  },
  contact_phone: { check: phone, save: (d, v) => { d.contact_phone = v; } },
  baptism: {
    check: (t, w) => (w.is(t, "kw_yes") ? { value: true } : w.is(t, "kw_no") ? { value: false } : { error: true }),
    save(d, v) {
      d.baptism_same = v;
      if (v) d.baptism_street = d.baptism_city = d.baptism_state = d.baptism_zip = null;
    },
    next: (v) => (v ? [] : ["b_street", "b_city", "b_state", "b_zip"]),
  },
  b_street: { check: required, save: (d, v) => { d.baptism_street = v; } },
  b_city: { check: required, save: (d, v) => { d.baptism_city = v; } },
  // Baptisms are in the church's country.
  b_state: { check: stateFor, save: (d, v) => { d.baptism_state = v; } },
  b_zip: { check: zipFor, save: (d, v) => { d.baptism_zip = v; } },
  map: {
    check: (t, w) => (w.is(t, "kw_yes") ? { value: true } : w.is(t, "kw_no") ? { value: false } : { error: true }),
    save: (d, v) => { d.public_map = v; },
  },
  consent: {
    check: (t, w) => (w.is(t, "kw_yes") ? { value: true } : { error: true }),
    save: (d) => { d.consent = true; },
  },
};

export const QUESTIONS = [
  "name", "email", "church", "country", "street", "city", "state", "zip", "denom",
  "website", "contact", "baptism", "map", "consent",
];

// EDIT <n> re-asks the questions of item n. The numbers are those of the
// summary signups used to get before finishing (no longer sent), so texts
// like EDIT 4 keep meaning the same thing; the country, added later, is 13.
const EDIT_ITEMS = [
  ["name"], ["email"], ["church"], ["street"], ["city"], ["state"], ["zip"], ["denom"],
  ["website"], ["contact"], ["baptism"], ["map"],
  // A new country needs its state and postal code again.
  ["country", "state", "zip"],
];

export function newState() {
  return { phase: "lang", lang: null, queue: [], editing: false, data: {} };
}

// Uppercase, accents and surrounding punctuation removed, so "Sí." matches SI.
function normalize(s) {
  return String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/^[\s.,;:!?¡¿'"()]+|[\s.,;:!?¡¿'"()]+$/g, "")
    .replace(/\s+/g, " ");
}

export function createEngine({ prompts, languages }) {
  const en = prompts.en || {};

  function text(lang, key, vars = {}) {
    const s = prompts[lang]?.[key] ?? en[key] ?? "";
    return s.replace(/\{(\w+)\}/g, (m, p) => (vars[p] != null ? vars[p] : m));
  }

  // Keyword lists are comma separated (Chinese, Japanese and Arabic commas
  // count too); English always works as well.
  function words(lang, key, builtIn = []) {
    const list = [en[key], prompts[lang]?.[key]].filter(Boolean).join(",");
    return new Set([...builtIn, ...list.split(/[,，、،]/)].map(normalize).filter(Boolean));
  }

  function menuList() {
    return languages.map((l, i) => `${i + 1} ${l.menu_label}`).join("\n");
  }

  function menu() {
    return [text("en", "menu_intro"), menuList(), text("en", "menu_footer")].filter(Boolean).join("\n");
  }

  // The thank-you with the link to their own page, where they can see and
  // change every answer.
  function finished(state, extra, key = "done") {
    const link = extra.link ? text(state.lang, "done_link", { link: extra.link }) : "";
    // Without done_link in this language, the link alone.
    const linkLine = link && link.includes(extra.link) ? link : extra.link;
    return [text(state.lang, key), linkLine].filter(Boolean).join("\n");
  }

  // Outside the US, state and ZIP questions become region and postal code
  // (for the church and the baptism site alike).
  function intl(state, id) {
    if (isUS(state.data)) return null;
    return ["state", "b_state"].includes(id) ? "region" : ["zip", "b_zip"].includes(id) ? "postal" : null;
  }

  function question(state) {
    const id = state.queue[0];
    const other = intl(state, id);
    const key = other ? `ask_${other}` : state.editing && en[`edit_${id}`] ? `edit_${id}` : `ask_${id}`;
    return text(state.lang, key, { name: state.data.name, contact: state.data.contact_name });
  }

  function start() {
    return { state: newState(), replies: [menu()] };
  }

  // Starts in a language guessed from the first text, skipping the menu.
  // lang_detected says how to get the menu instead.
  function startIn(code) {
    if (!languages.some((l) => l.code === code)) return start();
    const state = { ...newState(), phase: "collect", lang: code, queue: [...QUESTIONS] };
    return { state, replies: [text(code, "lang_detected"), text(code, "welcome"), question(state)].filter(Boolean) };
  }

  // extra.link: the pastor's own page (/p/<key>), added to the DONE message.
  function reply(previous, input, extra = {}) {
    const state = JSON.parse(JSON.stringify(previous || newState()));
    const raw = String(input ?? "").trim();
    const word = normalize(raw);
    const lang = state.lang || "en";
    const is = (t, key, builtIn) => words(lang, key, builtIn).has(normalize(t));
    const send = (...replies) => ({ state, replies: replies.filter(Boolean) });

    // After an opt-out nothing is sent, not even to a second STOP, until an
    // opt-in word.
    if (state.phase === "stopped") {
      return is(word, "kw_start", CARRIER_START) ? start() : send();
    }
    if (is(word, "kw_stop", CARRIER_STOP)) {
      state.phase = "stopped";
      return send(text(lang, "stop"));
    }
    if (is(word, "kw_restart")) {
      return { state: newState(), replies: [text(lang, "restart"), menu()] };
    }
    if (state.phase !== "lang" && is(word, "kw_help", CARRIER_HELP)) {
      return send(text(lang, "help"));
    }
    // A change of language keeps the answers and the open question.
    if (is(word, "kw_menu", MENU_WORDS)) {
      state.phase = "lang";
      return send(menu());
    }

    if (state.phase === "lang") {
      const n = /^\d+$/.test(word) ? Number(word) : 0;
      const picked = languages[n - 1];
      if (!picked) return send([text("en", "menu_invalid"), menuList()].filter(Boolean).join("\n"));
      // Back here through MENU with answers already given: carry on in the
      // new language from where they were.
      if (Object.keys(state.data).length) {
        state.lang = picked.code;
        state.phase = state.queue.length ? "collect" : "done";
        return send(state.queue.length ? question(state) : finished(state, extra));
      }
      Object.assign(state, { phase: "collect", lang: picked.code, queue: [...QUESTIONS], editing: false, data: {} });
      return send(text(state.lang, "welcome"), question(state));
    }

    if (state.phase === "collect") {
      const id = state.queue[0];
      const step = STEPS[id];
      const result = step.check(raw, { is, data: state.data });
      if (result.error) return send(text(state.lang, `err_${intl(state, id) || id}`) || question(state));

      step.save(state.data, result.value);
      state.queue.shift();
      if (step.next) state.queue.unshift(...step.next(result.value));
      if (state.queue.length) return send(question(state));

      // The last answer finishes the signup: no summary to confirm, just
      // the thank-you and their page's link.
      const edited = state.editing;
      state.editing = false;
      state.phase = "done";
      return send(finished(state, extra, edited ? "edit_saved" : "done"));
    }

    // done, or "summary" for a signup still waiting on DONE from before the
    // summary was dropped. DONE (again) sends the link again.
    if (is(word, "kw_done")) {
      state.phase = "done";
      return send(finished(state, extra));
    }
    const editWords = [...words(lang, "kw_edit")].map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const edit = word.match(new RegExp(`^(?:${editWords.join("|")})\\s*(\\d+)$`));
    if (edit) {
      const item = EDIT_ITEMS[Number(edit[1]) - 1];
      if (!item) return send(text(state.lang, "edit_invalid"));
      Object.assign(state, { phase: "collect", queue: [...item], editing: true });
      return send(question(state));
    }
    // Not a command: `unhandled` lets the SMS handler pass a finished
    // signup's text to the reviewers instead of sending this.
    return { ...send(text(state.lang, state.phase === "done" ? "done_reply" : "summary_hint")), unhandled: true };
  }

  // The open question again (or the menu), without taking an answer: for a
  // text with only a picture in it.
  function again(previous) {
    const state = previous || newState();
    if (state.phase === "collect" && state.queue.length) return [question(state)];
    if (state.phase === "lang") return [menu()];
    if (state.phase === "summary") return [text(state.lang, "summary_hint")];
    return [];
  }

  return { start, startIn, reply, menu, again };
}
