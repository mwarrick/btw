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
// phase: "lang" | "collect" | "summary" | "done" | "stopped"
// queue: question ids still to ask; the first is the one awaiting an answer
// data:  answers, named like the btw_churches columns

const US_STATES = {
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

function phone(text) {
  let d = text.replace(/\D/g, "");
  if (d.length === 11 && d[0] === "1") d = d.slice(1);
  return d.length === 10 ? { value: d } : { error: true };
}

function formatPhone(d) {
  return d ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : "";
}

// Each question has prompts ask_<id>, edit_<id> (when fixing it from the
// summary) and err_<id> (when the answer doesn't pass `check`).
const STEPS = {
  name: { check: required, save: (d, v) => { d.name = v; } },
  email: {
    check: (t) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? { value: t } : { error: true }),
    save: (d, v) => { d.email = v; },
  },
  church: { check: required, save: (d, v) => { d.church_name = v; } },
  street: { check: required, save: (d, v) => { d.street = v; } },
  city: { check: required, save: (d, v) => { d.city = v; } },
  state: { check: usState, save: (d, v) => { d.state = v; } },
  zip: { check: zip, save: (d, v) => { d.zip = v; } },
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
  b_state: { check: usState, save: (d, v) => { d.baptism_state = v; } },
  b_zip: { check: zip, save: (d, v) => { d.baptism_zip = v; } },
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
  "name", "email", "church", "street", "city", "state", "zip", "denom",
  "website", "contact", "baptism", "map", "consent",
];

// The numbered summary. EDIT <n> re-asks the questions in `edit`.
const SUMMARY = [
  { label: "sum_name", edit: ["name"], value: (d) => d.name },
  { label: "sum_email", edit: ["email"], value: (d) => d.email },
  { label: "sum_church", edit: ["church"], value: (d) => d.church_name },
  { label: "sum_street", edit: ["street"], value: (d) => d.street },
  { label: "sum_city", edit: ["city"], value: (d) => d.city },
  { label: "sum_state", edit: ["state"], value: (d) => d.state },
  { label: "sum_zip", edit: ["zip"], value: (d) => d.zip },
  { label: "sum_denom", edit: ["denom"], value: (d) => d.denomination },
  { label: "sum_website", edit: ["website"], value: (d) => d.website },
  {
    label: "sum_contact", edit: ["contact"],
    value: (d, t) => (d.contact_name ? `${d.contact_name} ${formatPhone(d.contact_phone)}` : t("val_you")),
  },
  {
    label: "sum_baptism", edit: ["baptism"],
    value: (d, t) => d.baptism_same === false
      ? `${d.baptism_street}, ${d.baptism_city}, ${d.baptism_state} ${d.baptism_zip}`
      : t("val_same"),
  },
  { label: "sum_map", edit: ["map"], value: (d, t) => t(d.public_map ? "val_yes" : "val_no") },
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

  function summary(state) {
    const t = (key) => text(state.lang, key);
    const lines = SUMMARY.map((item, i) => `${i + 1} ${t(item.label)}: ${item.value(state.data, t) || "-"}`);
    return [t("sum_intro"), ...lines, "", t("sum_outro")].join("\n");
  }

  function question(state) {
    const id = state.queue[0];
    const key = state.editing && en[`edit_${id}`] ? `edit_${id}` : `ask_${id}`;
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

  function reply(previous, input) {
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
        state.phase = state.queue.length ? "collect" : "summary";
        return send(state.queue.length ? question(state) : summary(state));
      }
      Object.assign(state, { phase: "collect", lang: picked.code, queue: [...QUESTIONS], editing: false, data: {} });
      return send(text(state.lang, "welcome"), question(state));
    }

    if (state.phase === "collect") {
      const id = state.queue[0];
      const step = STEPS[id];
      const result = step.check(raw, { is });
      if (result.error) return send(text(state.lang, `err_${id}`) || question(state));

      step.save(state.data, result.value);
      state.queue.shift();
      if (step.next) state.queue.unshift(...step.next(result.value));
      if (state.queue.length) return send(question(state));

      const saved = state.editing ? text(state.lang, "edit_saved") : null;
      state.editing = false;
      state.phase = "summary";
      return send(saved, summary(state));
    }

    // summary or done
    if (is(word, "kw_done")) {
      state.phase = "done";
      return send(text(state.lang, "done"));
    }
    const editWords = [...words(lang, "kw_edit")].map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const edit = word.match(new RegExp(`^(?:${editWords.join("|")})\\s*(\\d+)$`));
    if (edit) {
      const item = SUMMARY[Number(edit[1]) - 1];
      if (!item) return send(text(state.lang, "edit_invalid"));
      Object.assign(state, { phase: "collect", queue: [...item.edit], editing: true });
      return send(question(state));
    }
    // Not a command: `unhandled` lets the SMS handler pass a finished
    // signup's text to the reviewers instead of sending this.
    return { ...send(text(state.lang, state.phase === "done" ? "done_reply" : "summary_hint")), unhandled: true };
  }

  return { start, startIn, reply, menu };
}
