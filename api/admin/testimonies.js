// /api/admin/testimonies.js
// Baptism testimonies for the team (Testimonies in /admin), and the advice
// shown beside the form (btw_guides, key "testimony"). Needs the admin session.
//
//   GET                       -> { testimonies, unseen, featured, waiting, private, church_only, parent }:
//                                every story its writer shared with the team, latest change
//                                first, with its church; the rest are only counted (kept
//                                private, or for their church only); `waiting` counts links
//                                sent but nothing written yet, `parent` under-18s' stories
//                                waiting for a parent or guardian's approval (lib/stories.js)
//   PATCH ?id= { seen: true } -> { ok }: no longer New
//   PATCH ?id= { featured }   -> { ok, sent, texted }: starred to feature, or not; featuring hands
//                                it to Baptize (saveStory in lib/baptize.js, mocked: `sent` is
//                                "mocked") and texts the writer once (story_featured, `texted`)
//   POST ?part=samples        -> { added }: replaces the three sample stories (lib/simulations.js)
//   POST ?id= { translate: true } -> { text }: the story in English (not saved)
//   DELETE ?id=               -> { deleted: true }
//   GET ?part=guide[&key=]    -> { guides: [{ lang, body, updated_at, editor }], languages }
//   PUT ?part=guide { key, lang, body } -> { guide }: saves one language; empty removes a
//                                translation (English shows instead), never English
//   POST ?part=guide-translate { key } -> { results: [{ lang, name, saved, error }] }: the
//                                English text, machine-translated into every switched-on
//                                language and saved, for a person to check
//   The texts (btw_guides key): "testimony", the advice; "story_examples", the
//   example stories built from the form's questions.

import { requireAdmin } from "../../lib/admin-auth.js";
import { saveStory } from "../../lib/baptize.js";
import { logEvent } from "../../lib/events.js";
import { siteUrl } from "../../lib/profile-link.js";
import { readable } from "../../lib/stories.js";
import { db, dbAll, eq } from "../../lib/supabase.js";
import { canText, explainStatus, sendText } from "../../lib/voipms.js";
import { wording } from "../../lib/web-text.js";
import { addSampleStoriesToSimulation } from "../../lib/simulations.js";
import { translate } from "../../lib/translate.js";

const GUIDES = ["testimony", "story_examples"];
const guideKey = (k) => (GUIDES.includes(k) ? k : "testimony");
const GUIDE_MAX = 8000;

export default async function handler(req, res) {
  const user = await requireAdmin(req, res);
  if (!user) return;
  try {
    const params = new URL(req.url, "http://x").searchParams;
    const part = params.get("part");
    const id = Number(params.get("id"));
    if (part === "guide" && req.method === "GET") return await guides(guideKey(params.get("key")), res);
    if (part === "guide" && req.method === "PUT") return await saveGuide(guideKey(req.body?.key), req.body || {}, user, res);
    if (part === "guide-translate" && req.method === "POST") return await translateGuide(guideKey(req.body?.key), user, res);
    if (part === "samples" && req.method === "POST") {
      const added = await addSampleStoriesToSimulation();
      return added ? res.status(200).json({ added }) : res.status(400).json({ error: "Add simulations first (Conversations): the sample stories belong to a simulated church." });
    }
    if (req.method === "GET") return await list(res);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: "Send ?id= of a testimony." });
    if (req.method === "PATCH" && typeof req.body?.featured === "boolean") {
      // Only a story its writer shared with the team (and, under 18, their
      // parent or guardian approved) can be featured.
      const [story] = await db(`btw_testimonies?id=eq.${id}&select=first_name,lang,body,answers,consent_text,adult,guardian_name,`
        + "guardian_at,church_id,share,phone,key,simulated,featured_texted_at");
      if (!story || story.share !== "baptize" || !readable(story)) return res.status(404).json({ error: "That story isn't shared with the team." });
      await db(`btw_testimonies?id=eq.${id}`, { method: "PATCH", body: { featured_at: req.body.featured ? new Date().toISOString() : null } });
      if (!req.body.featured) return res.status(200).json({ ok: true });
      const texted = await textFeatured(req, id, story);
      const [church] = story.church_id ? await db(`btw_churches?id=eq.${story.church_id}&select=church_name,city,state,country`) : [];
      const sent = await saveStory({ ...story, church_name: church?.church_name,
        church_place: church ? [church.city, church.state, church.country && church.country !== "US" ? church.country : null].filter(Boolean).join(", ") : null });
      return res.status(200).json({ ok: true, sent: sent.mocked ? "mocked" : "sent", texted });
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

// The writer hears once that their story was featured, with its link.
// Never for a sample story, and only where we can text (lib/voipms.js canText).
async function textFeatured(req, id, story) {
  const to = canText(story.phone);
  if (story.simulated || story.featured_texted_at || !to || !story.key) return false;
  const lang = story.lang || "en";
  const template = (await wording(lang, ["story_featured"])).story_featured || "The Baptize 2027 team featured your baptism story. Thank you for sharing it! {link}";
  const link = `${siteUrl(req)}/s/${story.key}`;
  try {
    await sendText(to, template.includes("{link}") ? template.replace("{link}", link) : `${template} ${link}`);
  } catch (err) {
    const why = err.status ? explainStatus(err.status) : err.message;
    await logEvent("error", "story", `The "story featured" text wasn't sent: ${why}`, { phone: story.phone });
    return false;
  }
  await db(`btw_testimonies?id=eq.${id}`, { method: "PATCH", body: { featured_texted_at: new Date().toISOString() } });
  return true;
}

async function list(res) {
  const rows = await dbAll("btw_testimonies?select=id,phone,church_id,lang,first_name,answers,body,share,adult,guardian_name,"
    + "guardian_at,submitted_at,updated_at,seen_at,featured_at,simulated&order=id");
  const written = rows.filter((t) => t.submitted_at);
  const saved = written.filter((t) => t.share === "baptize" && readable(t));
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
    church_only: written.filter((t) => t.share === "church" && readable(t)).length,
    parent: written.filter((t) => !readable(t)).length,
  });
}

async function guides(GUIDE, res) {
  const [rows, languages] = await Promise.all([
    db(`btw_guides?key=eq.${GUIDE}&select=lang,body,updated_at,editor:btw_users(name)`),
    db("btw_languages?select=code,name,active&order=menu_order"),
  ]);
  res.status(200).json({ guides: rows, languages });
}

async function saveGuide(GUIDE, body, user, res) {
  const lang = String(body.lang || "");
  const text = String(body.body ?? "").replace(/\r\n/g, "\n").trim();
  const [language] = await db(`btw_languages?code=${eq(lang)}&select=code`);
  if (!language) return res.status(400).json({ error: "No such language." });
  if (text.length > GUIDE_MAX) return res.status(400).json({ error: `Keep it under ${GUIDE_MAX} characters.` });
  if (!text) {
    if (lang === "en") return res.status(400).json({ error: "The English can't be empty: it's shown wherever a translation is missing." });
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
async function translateGuide(GUIDE, user, res) {
  const [[english], languages] = await Promise.all([
    db(`btw_guides?key=eq.${GUIDE}&lang=eq.en&select=body`),
    db("btw_languages?active=eq.true&select=code,name&order=menu_order"),
  ]);
  if (!english?.body) return res.status(400).json({ error: "Save the English first." });
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
