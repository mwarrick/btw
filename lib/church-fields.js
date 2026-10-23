// lib/church-fields.js
// Checks and tidies a signup's answers sent from a form: the reviewers'
// editor in /admin (api/admin/churches.js) and the pastor's own page
// (api/profile.js). The rules match the SMS signup's.

import { US_STATES } from "../public/js/engine.js";

const TEXT = ["name", "email", "church_name", "street", "city", "state", "zip", "denomination", "website",
  "contact_name", "contact_phone", "baptism_street", "baptism_city", "baptism_state", "baptism_zip"];
const BOOLEAN = ["baptism_same", "public_map"];

// The answers a form may change.
export const EDITABLE = [...TEXT, ...BOOLEAN];

// For each field, the prompt whose text explains a bad answer, so the
// pastor's page can show it in their language.
export const ERROR_PROMPTS = {
  name: "err_name", email: "err_email", church_name: "err_church", state: "err_state", zip: "err_zip",
  website: "err_website", contact_phone: "err_contact_phone", baptism_state: "err_b_state", baptism_zip: "err_b_zip",
};

// The fields sent, tidied and checked. Returns { fields } or, for the first
// problem, { error, field } with an English error.
export function cleanChurchFields(body) {
  const fields = {};
  for (const key of TEXT) {
    if (body[key] === undefined) continue;
    const v = String(body[key] ?? "").trim();
    fields[key] = v || null;
  }
  for (const key of BOOLEAN) {
    if (body[key] === undefined) continue;
    fields[key] = body[key] === null ? null : !!body[key];
  }
  const problem = (field, error) => ({ error, field });

  if ("name" in fields && !fields.name) return problem("name", "Enter their name.");
  if ("church_name" in fields && !fields.church_name) return problem("church_name", "Enter the church name.");
  if (fields.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) return problem("email", "That email doesn't look right.");
  for (const key of ["state", "baptism_state"]) {
    if (!fields[key]) continue;
    const s = fields[key].toUpperCase();
    const abbr = US_STATES[s] ? s : Object.keys(US_STATES).find((a) => US_STATES[a].toUpperCase() === s);
    if (!abbr) return problem(key, `"${fields[key]}" isn't a US state.`);
    fields[key] = abbr;
  }
  for (const key of ["zip", "baptism_zip"]) {
    if (fields[key] && !/^\d{5}$/.test(fields[key])) return problem(key, "ZIP codes have 5 digits.");
  }
  if (fields.contact_phone) {
    let d = fields.contact_phone.replace(/\D/g, "");
    if (d.length === 11 && d[0] === "1") d = d.slice(1);
    if (d.length !== 10) return problem("contact_phone", "The main contact's phone needs 10 digits.");
    fields.contact_phone = d;
  }
  if (fields.website) {
    if (!/\.[a-z]{2,}/i.test(fields.website) || /\s/.test(fields.website)) return problem("website", "That website doesn't look right.");
    if (!/^https?:\/\//i.test(fields.website)) fields.website = "https://" + fields.website;
  }
  if ("contact_name" in fields && !fields.contact_name) fields.contact_phone = null;
  if (fields.baptism_same === true) {
    fields.baptism_street = fields.baptism_city = fields.baptism_state = fields.baptism_zip = null;
  }
  return { fields };
}
