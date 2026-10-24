// lib/storage.js
// Supabase Storage over fetch, like lib/supabase.js does for the database.
// Server-side only (service role key). Buckets are private: files are shown
// through signed links that expire.

const base = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  const headers = { apikey: key };
  // As in lib/supabase.js: only legacy JWT keys go in Authorization.
  if (key.startsWith("eyJ")) headers.Authorization = `Bearer ${key}`;
  return { root: `${url.replace(/\/$/, "")}/storage/v1`, headers };
};

async function call(path, init) {
  const { root, headers } = base();
  const res = await fetch(`${root}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  if (!res.ok) throw new Error(data?.message || data?.error || `Storage returned ${res.status}.`);
  return data;
}

// Saves bytes at bucket/path (never overwrites).
export function putObject(bucket, path, bytes, contentType) {
  return call(`/object/${bucket}/${path}`, { method: "POST", headers: { "Content-Type": contentType, "x-upsert": "false" }, body: bytes });
}

// Links that open each path for `seconds`, as { path: url }.
export async function signUrls(bucket, paths, seconds = 3600) {
  if (!paths.length) return {};
  const { root } = base();
  const rows = await call(`/object/sign/${bucket}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: seconds, paths }),
  });
  return Object.fromEntries(rows.filter((r) => r.signedURL).map((r) => [r.path, root + r.signedURL]));
}

// Deletes the paths for good.
export function removeObjects(bucket, paths) {
  if (!paths.length) return Promise.resolve();
  return call(`/object/${bucket}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefixes: paths }) });
}
