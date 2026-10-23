// dev/fake-db.mjs
// An in-memory stand-in for Supabase (PostgREST), voip.ms and Google
// Translate, for running the API handlers locally with no network. Importing
// it replaces globalThis.fetch. It supports what the handlers use: eq / in /
// is.null filters, on_conflict upserts (also composite keys), bulk inserts,
// PATCH, DELETE, return=representation, and the sender:/editor:btw_users(name)
// embeds. Ordering and select lists are ignored. Prompts are placeholders like
// <ask_name>, plus the real English keyword lists.

const KW = { kw_yes: "YES,Y", kw_no: "NO,N", kw_skip: "SKIP", kw_edit: "EDIT", kw_done: "DONE",
  kw_help: "HELP", kw_restart: "RESTART", kw_start: "START", kw_stop: "STOP", kw_menu: "MENU" };
const keys = ["menu_intro","menu_footer","menu_invalid","lang_detected","welcome","help","stop","restart","done","done_reply",
  "summary_hint","edit_saved","edit_invalid","sum_intro","sum_outro","val_you","val_same","val_yes","val_no"];
for (const q of ["name","email","church","street","city","state","zip","denom","website","contact","contact_phone","baptism","b_street","b_city","b_state","b_zip","map","consent"])
  keys.push("ask_"+q, "err_"+q, "edit_"+q);
for (const s of ["name","email","church","street","city","state","zip","denom","website","contact","baptism","map"]) keys.push("sum_"+s);

export const tables = { btw_languages: [{ code: "en", name: "English", menu_label: "English", active: true, menu_order: 1 }],
  btw_prompts: [...keys.map((k) => ({ key: k, lang: "en", text: `<${k}>` })),
    ...Object.entries(KW).map(([k, t]) => ({ key: k, lang: "en", text: t }))],
  btw_sessions: [], btw_churches: [], btw_messages: [], btw_events: [], btw_prompt_keys: [], btw_users: [] };
export const sent = [];
export let failSend = false; export function setFailSend(v) { failSend = v; }
let nextId = 1;
const keyOf = { btw_sessions: "phone", btw_churches: "phone", btw_messages: "provider_id" };

globalThis.fetch = async (url, opts = {}) => {
  url = String(url);
  // Google Translate: "translates" to "[es] text"; detects everything as English.
  if (url.includes("translation.googleapis.com")) {
    const b = JSON.parse(opts.body);
    if (url.endsWith("/detect")) return new Response(JSON.stringify({ data: { detections: [[{ language: "en", confidence: 1 }]] } }));
    return new Response(JSON.stringify({ data: { translations: b.q.map((q) => ({ translatedText: `[${b.target}] ${q}` })) } }));
  }
  if (!url.includes("/rest/v1/")) {
    const p = new URLSearchParams(opts.body);
    if (failSend) return new Response(JSON.stringify({ status: "ip_not_enabled" }));
    if (p.get("method") === "sendSMS" && p.get("message").length > 70 && /[^\x00-\x7f]/.test(p.get("message"))) return new Response(JSON.stringify({ status: "sms_toolong" }));
    sent.push({ to: p.get("dst"), method: p.get("method"), message: p.get("message") });
    return new Response(JSON.stringify({ status: "success", sms: 1 }));
  }
  const u = new URL(url); const table = u.pathname.split("/").pop();
  const rows = tables[table]; const method = opts.method || "GET";
  const filters = [...u.searchParams].filter(([k]) => !["select","order","on_conflict"].includes(k));
  const match = (r) => filters.every(([k, v]) => {
    if (v.startsWith("eq.")) return String(r[k]) === v.slice(3);
    if (v.startsWith("in.")) return v.slice(4, -1).split(",").map((x) => x.replace(/^"|"$/g, "")).includes(String(r[k]));
    if (v === "is.null") return r[k] == null;
    return true; });
  const json = (d) => new Response(d === undefined ? "" : JSON.stringify(d), { status: 200 });
  const sel = u.searchParams.get("select") || "";
  const person = (id) => { const x = tables.btw_users.find((x) => x.id === id); return x ? { name: x.name } : null; };
  const embed = (list) => list.map((r) => ({ ...r,
    ...(sel.includes("sender:btw_users") ? { sender: person(r.sent_by) } : {}),
    ...(sel.includes("editor:btw_users") ? { editor: person(r.edited_by) } : {}) }));
  if (method === "GET") return json(embed(rows.filter(match)));
  if (method === "DELETE") { tables[table] = rows.filter((r) => !match(r)); return json(); }
  if (method === "PATCH") { const b = JSON.parse(opts.body); const hit = rows.filter(match); for (const r of hit) Object.assign(r, b); return json((opts.headers?.Prefer || "").includes("return=representation") ? embed(hit) : undefined); }
  const parsed = JSON.parse(opts.body); const prefer = opts.headers?.Prefer || "";
  const keys = (u.searchParams.get("on_conflict") || "").split(",").filter(Boolean);
  const all = [];
  for (const body of Array.isArray(parsed) ? parsed : [parsed]) {
  const existing = keys.length && keys.every((k) => body[k] != null) && rows.find((r) => keys.every((k) => r[k] === body[k]));
  let out;
  if (existing) { if (prefer.includes("ignore-duplicates")) out = []; else { Object.assign(existing, body, { updated_at: new Date(Date.now() - 3600e3 + nextId * 20e3).toISOString() }); out = [existing]; } }
  else { const t = new Date(Date.now() - 3600e3 + nextId * 20e3).toISOString(); const row = { id: table === "btw_users" ? crypto.randomUUID() : nextId++, created_at: t, updated_at: t, ...(table === "btw_users" ? { active: true, session_version: 1 } : {}), ...body }; rows.push(row); out = [row]; }
  all.push(...out); }
  return json(prefer.includes("return=representation") ? embed(all) : undefined);
};
