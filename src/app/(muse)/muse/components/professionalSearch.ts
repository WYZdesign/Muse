// Audit fix (2026-10-07): NetworkScreen's professional search hits the generic
// `search` action (type: "users"), which returns `muse_profiles` rows
// (avatar/styles, no exp/openings/rate). The directory UI is built for the
// `muse_professionals` shape (img/exp/openings/rate/skills). Map the row into
// that shape so results render real photos + defined fields instead of broken
// images and literal `undefined` stat tiles.
import type { Professional } from "./types";

// The live search row is a `muse_profiles` record (avatar/styles, no
// exp/openings/rate) while the directory UI reads the `muse_professionals`
// shape, so the input only needs the fields this mapper actually touches.
type ProfessionalInput = {
  id?: string | number;
  profileId?: string | number;
  name?: string;
  type?: string;
  avatar?: string;
  img?: string;
  exp?: string;
  rate?: string;
  openings?: number;
  skills?: string[];
  styles?: string[];
  looking?: string[];
  nsfw?: boolean;
  loc?: string;
};

export function toProfessionalRow(u: unknown): Professional {
  const r = u as ProfessionalInput;
  return {
    ...r,
    img: r.avatar || r.img || "",
    exp: r.exp || "",
    rate: r.rate || "",
    openings: typeof r.openings === "number" ? r.openings : 0,
    skills: Array.isArray(r.skills) ? r.skills : (Array.isArray(r.styles) ? r.styles : []),
    looking: Array.isArray(r.looking) ? r.looking : [],
    nsfw: !!r.nsfw,
    profileId: r.profileId || r.id,
  } as unknown as Professional;
}
