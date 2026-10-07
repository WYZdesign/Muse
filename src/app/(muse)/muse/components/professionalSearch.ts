// Audit fix (2026-10-07): NetworkScreen's professional search hits the generic
// `search` action (type: "users"), which returns `muse_profiles` rows
// (avatar/styles, no exp/openings/rate). The directory UI is built for the
// `muse_professionals` shape (img/exp/openings/rate/skills). Map the row into
// that shape so results render real photos + defined fields instead of broken
// images and literal `undefined` stat tiles.
export function toProfessionalRow(u: any) {
  return {
    ...u,
    img: u.avatar || u.img || "",
    exp: u.exp || "",
    rate: u.rate || "",
    openings: typeof u.openings === "number" ? u.openings : 0,
    skills: Array.isArray(u.skills) ? u.skills : (Array.isArray(u.styles) ? u.styles : []),
    looking: Array.isArray(u.looking) ? u.looking : [],
    nsfw: !!u.nsfw,
    profileId: u.profileId || u.id,
  };
}
