// lib/baptize.js
// The hand-off to Baptize The World's own platform (baptize.org), mocked:
// Baptize has no API yet (hackathon docs, "How Baptize works today"). One
// function per action, so a real connection replaces only this file.
//
// saveStory: a story its writer shared with the team ("My church and the
// Baptize 2027 team, who may feature it") and the team has featured, in the
// shape Baptize's hand-made testimonies take today (quote, name, church).
// For now it only writes an info line to the Log panel and returns
// { mocked: true }.

import { logEvent } from "./events.js";

export async function saveStory(story) {
  const payload = {
    name: story.first_name || null,
    quote: story.quote || null,
    story: story.body || "",
    language: story.lang || "en",
    church: story.church_name || null,
    place: story.church_place || null,
    verse: story.answers?.verse || null,
    consent: story.consent_text || null,
    under_18_guardian: story.adult === false ? story.guardian_name || null : null,
  };
  await logEvent("info", "baptize", `Story by ${payload.name || "someone"} would be sent to baptize.org (mocked: Baptize has no API yet).`, { detail: payload });
  return { mocked: true, payload };
}
