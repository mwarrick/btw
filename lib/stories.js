// lib/stories.js
// Who may read a baptism story (api/story.js): an under-18's story shared
// with anyone needs their parent or guardian's approval first (their own
// link, /g/<guardian_key>); until then only the writer sees it. Used by the
// church's Stories tab (api/profile.js) and the team's list (api/admin/testimonies.js).

export const needsGuardian = (s) => !!s.share && s.share !== "me" && s.adult === false;
export const readable = (s) => !needsGuardian(s) || !!s.guardian_at;
