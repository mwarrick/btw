// lib/supabase.js
// Calls the Supabase REST API (PostgREST) with fetch, so the functions need
// no dependencies. Server-side only: the service role key bypasses row
// level security, which is how every btw_ table is reached.
//
// Env vars:
//   SUPABASE_URL               https://<project-ref>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY  the service role (secret) key

// db("btw_languages?order=menu_order")
// db("btw_prompts?on_conflict=key,lang", { method: "POST", body: [...], prefer: "resolution=merge-duplicates" })
export async function db(path, { method = "GET", body, prefer } = {}) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");

  const headers = { apikey: key };
  // Legacy keys are JWTs and go in Authorization too; the newer sb_secret_
  // keys only go in apikey.
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (prefer) headers.Prefer = prefer;

  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || `Supabase returned ${res.status}.`);
  return data;
}

// Quotes a value for a PostgREST filter such as key=eq.<value>.
export function eq(value) {
  return "eq." + encodeURIComponent(value);
}
