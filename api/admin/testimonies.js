// /api/admin/testimonies.js
// Baptism testimonies for the team (Testimonies in /admin), and the advice
// shown beside the form (btw_guides, key "testimony"). Needs the admin session.
//
//   GET                       -> { testimonies, unseen, featured, waiting, private, church_only }:
//                                every story its writer shared with the team, latest change
//                                first, with its church; the rest are only counted (kept
//                                private, or for their church only); `waiting` counts links
//                                sent but nothing written yet
//   PATCH ?id= { seen: true } -> { ok }: no longer New
//   PATCH ?id= { featured }   -> { ok }: starred to feature, or not
//   POST ?id= { translate: true } -> { text }: the story in English (not saved)
//   DELETE ?id=               -> { deleted: true }
//   GET ?part=guide           -> { guides: [{ lang, body, updated_at, editor }], languages }
//   PUT ?part=guide { lang, body } -> { guide }: saves one language; empty removes a
//                                translation (English shows instead), never English
//   POST ?part=guide-translate -> { results: [{ lang, name, saved, error }] }: the English
//                                advice, machine-translated into every switched-on
//                                language and saved, for a person to check

import { requireAdmin } from "../../lib/admin-auth.js";
import { db, dbAll, eq } from "../../lib/supabase.js";
import { translate } from "../../lib/translate.js";

const GUIDE = "testimony";
const GUIDE_MAX = 8000;

export default async function handler(req, res) {
  const user = await requireAdmin(req, res);
  if (!user) return;
  try {
    const params = new URL(req.url, "http://x").searchParams;
    const part = params.get("part");
    const id = Number(params.get("id"));
    if (part === "guide" && req.method === "GET") return await guides(res);
    if (part === "guide" && req.method === "PUT") return await saveGuide(req.body || {}, user, res);
    if (part === "guide-translate" && req.method === "POST") return await translateGuide(user, res);
    if (req.method === "GET") return await list(res);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Send ?id= of a testimony." });
    if (req.method === "PATCH" && typeof req.body?.featured === "boolean") {
      // Only a story its writer shared with the team can be featured.
      const done = await db(`btw_testimonies?id=eq.${id}&share=eq.baptize&select=id`, {
        method: "PATCH", body: { featured_at: req.body.featured ? new Date().toISOString() : null }, prefer: "return=representation",
      });
      if (!done.length) return res.status(404).json({ error: "That story isn't shared with the team." });
      return res.status(200).json({ ok: true });
    }
    if (req.method === "PATCH") {
      await db(`btw_testimonies?id=eq.${id}`, { method: "PATCH", body: { seen_at: new Date().toISOString() } });
      return res.status(200).json({ ok: true });
    }
    if (req.method === "POST" && req.body?.translate) {
      const [story] = await db(`btw_testimonies?id=eq.${id}&select=body,lang`);
      if (!story?.body) return res.status(404).json({ error: "No such testimony." });
      const [text] = await translate([story.body], "en", story.lang && story.lang !== "en" ? story.lang : null);
      return res.status(200).json({ text });
    }
    if (req.method === "DELETE") {
      await db(`btw_testimonies?id=eq.${id}`, { method: "DELETE" });
      return res.status(200).json({ deleted: true });
    }
    res.setHeader("Allow", "GET, PATCH, POST, PUT, DELETE");
    res.status(405).json({ error: "Not something this endpoint does." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function list(res) {
  const rows = await dbAll("btw_testimonies?select=id,phone,church_id,lang,first_name,answers,body,share,adult,guardian_name,"
    + "guardian_at,submitted_at,updated_at,seen_at,featured_at&order=id");
  const written = rows.filter((t) => t.submitted_at);
  const saved = written.filter((t) => t.share === "baptize");
  const ids = [...new Set(saved.map((t) => t.church_id).filter(Boolean))];
  const churches = ids.length ? await db(`btw_churches?id=in.(${ids.join(",")})&select=id,phone,church_name,city,state,country`) : [];
  const byId = new Map(churches.map((c) => [String(c.id), c]));
  const testimonies = saved
    .map((t) => {
      const c = byId.get(String(t.church_id));
      return { ...t, church_name: c?.church_name || null, church_phone: c?.phone || null,
        church_place: c ? [c.city, c.state, c.country && c.country !== "US" ? c.country : null].filter(Boolean).join(", ") : null };
    })
    .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
  res.status(200).json({
    testimonies,
    unseen: testimonies.filter((t) => !t.seen_at).length,
    featured: testimonies.filter((t) => t.featured_at).length,
    waiting: rows.length - written.length,
    private: written.filter((t) => t.share === "me").length,
    church_only: written.filter((t) => t.share === "church").length,
  });
}

async function guides(res) {
  const [rows, languages] = await Promise.all([
    db(`btw_guides?key=eq.${GUIDE}&select=lang,body,updated_at,editor:btw_users(name)`),
    db("btw_languages?select=code,name,active&order=menu_order"),
  ]);
  res.status(200).json({ guides: rows, languages });
}

async function saveGuide(body, user, res) {
  const lang = String(body.lang || "");
  const text = String(body.body ?? "").replace(/\r\n/g, "\n").trim();
  const [language] = await db(`btw_languages?code=${eq(lang)}&select=code`);
  if (!language) return res.status(400).json({ error: "No such language." });
  if (text.length > GUIDE_MAX) return res.status(400).json({ error: `Keep it under ${GUIDE_MAX} characters.` });
  if (!text) {
    if (lang === "en") return res.status(400).json({ error: "The English advice can't be empty: it's shown wherever a translation is missing." });
    await db(`btw_guides?key=eq.${GUIDE}&lang=${eq(lang)}`, { method: "DELETE" });
    return res.status(200).json({ guide: null });
  }
  const [guide] = await db("btw_guides?on_conflict=key,lang&select=lang,body,updated_at", {
    method: "POST",
    body: { key: GUIDE, lang, body: text, updated_by: user.id || null },
    prefer: "resolution=merge-duplicates,return=representation",
  });
  res.status(200).json({ guide });
}

// Line by line, keeping the page's markup: "## " headings, "• " bullets and
// a leading **bold** label are kept out of the text Google sees.
async function translateGuide(user, res) {
  const [[english], languages] = await Promise.all([
    db(`btw_guides?key=eq.${GUIDE}&lang=eq.en&select=body`),
    db("btw_languages?active=eq.true&select=code,name&order=menu_order"),
  ]);
  if (!english?.body) return res.status(400).json({ error: "Save the English advice first." });
  const lines = english.body.split("\n").map((line) => {
    const m = line.match(/^(## |• |- )?(?:\*\*(.+?)\*\*\s*)?(.*)$/);
    return { prefix: m[1] || "", bold: m[2] || "", rest: m[3] || "" };
  });
  const pieces = lines.flatMap((l) => [l.bold, l.rest]).filter(Boolean);
  const results = await Promise.all(languages.filter((l) => l.code !== "en").map(async (l) => {
    try {
      const out = await translate(pieces, l.code);
      let i = 0;
      const body = lines.map((line) => {
        const bold = line.bold ? out[i++] : "";
        const rest = line.rest ? out[i++] : "";
        return line.prefix + (bold ? `**${bold}**${rest ? " " : ""}` : "") + rest;
      }).join("\n");
      await db("btw_guides?on_conflict=key,lang", {
        method: "POST",
        body: { key: GUIDE, lang: l.code, body, updated_by: user.id || null },
        prefer: "resolution=merge-duplicates",
      });
      return { lang: l.code, name: l.name, saved: true };
    } catch (err) {
      return { lang: l.code, name: l.name, saved: false, error: err.message };
    }
  }));
  res.status(200).json({ results });
}
