// dev/server.mjs
// Runs the site locally against dev/fake-db.mjs: the real API handlers and
// public/ pages, with an in-memory database, fake voip.ms and fake Google
// Translate. Nothing leaves this machine.
//
//   node dev/server.mjs          then open http://localhost:8787/admin
//
// The setup password is "pw" (no users exist at first). A few conversations
// are seeded through the real SMS handler; "Add simulations" adds ten more.
// Everything is lost when the server stops.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tables } from "./fake-db.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT) || 8787;

Object.assign(process.env, {
  SMS_INBOUND_KEY: "k",
  SUPABASE_URL: "https://fake.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_fake",
  ADMIN_PASSWORD: "pw",
  GOOGLE_TRANSLATE_API_KEY: "fake",
  VOIPMS_DID: "5559990000",
});

// The prompt editor needs btw_prompt_keys.
tables.btw_prompt_keys = [...new Set(tables.btw_prompts.map((p) => p.key))].map((key, i) => ({
  key,
  section: key.startsWith("kw_") ? "keywords" : key.startsWith("sum_") || key.startsWith("val_") ? "summary"
    : /^(ask|err|edit)_/.test(key) ? "fields" : "system",
  description: key,
  placeholders: [],
  sort_order: i,
}));

// Every api/admin/*.js file, plus the SMS endpoints.
const handlers = {};
for (const file of fs.readdirSync(path.join(ROOT, "api/admin")).filter((f) => f.endsWith(".js"))) {
  handlers[`/api/admin/${file.slice(0, -3)}`] = (await import(path.join(ROOT, "api/admin", file))).default;
}
for (const name of ["sms-inbound", "sms-send", "prompts", "profile"]) {
  handlers[`/api/${name}`] = (await import(path.join(ROOT, "api", `${name}.js`))).default;
}

// A few conversations, texted in through the real handler.
let id = 1;
const text = (from, message) => new Promise((done) => handlers["/api/sms-inbound"](
  { url: `/api/sms-inbound?key=k&to=5559990000&from=${from}&message=${encodeURIComponent(message)}&id=${id++}` },
  { status() { return this; }, send: done },
));
for (const m of ["Hi! Saw the flyer", "Maria Lopez", "maria@gracechurch.org", "Grace Community Church", "yes", "100 Main St",
  "Austin", "TX", "78701", "Baptist", "gracechurch.org", "Pastor James", "512-555-0100", "yes", "Y", "yes",
  "Can someone call me about the location?"]) await text("5125550111", m);
for (const m of ["hello", "1", "Tom", "tom@x"]) await text("5125550122", m);

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const handler = handlers[url.pathname];
  if (handler) {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    req.body = raw ? JSON.parse(raw) : undefined;
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (data) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(data)); };
    res.send = (data) => res.end(String(data));
    return handler(req, res);
  }
  // vercel.json's rewrites and cleanUrls, by hand.
  const page = url.pathname === "/admin" ? "admin.html" : url.pathname === "/" ? "index.html"
    : url.pathname.startsWith("/p/") ? "profile.html" : url.pathname;
  const file = path.join(ROOT, "public", page);
  if (!file.startsWith(path.join(ROOT, "public")) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.statusCode = 404;
    return res.end();
  }
  res.setHeader("Content-Type", TYPES[path.extname(file)] || "text/plain");
  res.end(fs.readFileSync(file));
}).listen(PORT, () => console.log(`http://localhost:${PORT}/admin  (setup password: pw)`));
