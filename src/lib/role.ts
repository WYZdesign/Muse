// Muses ↔ Creatives duality — role detection, capabilities, and feature flags.
// Muses = industry-facing (hires, books, directs, produces).
// Creatives = talent-facing (gets hired, performs, creates).

// ── Type Sets ────────────────────────────────────────────────────────────────

export const MUSE_TYPES = new Set([
  "Casting Director", "Art Buyer", "Fine Art Agent", "Producer",
  "Creative Director", "Brand", "Agency", "Talent Agent", "Booking Agent",
  "Creative Recruiter", "HR / Creative Hiring", "Studio Executive",
  "Art Director", "Design Director", "Content Director",
  "Video Producer", "Film Producer", "Executive Producer", "Line Producer",
  "Showrunner", "Creative Producer", "Brand Manager", "Marketing Director",
  "Studio Owner", "Agency Owner", "Production Company Owner",
  "Creative Studio Founder", "Record Label Executive", "Publisher",
  "Gallery Owner", "Curator", "Creative Consultant",
  "Music Supervisor", "Sync Agent", "Licensing Manager",
  "Fashion Director", "Editorial Director", "Photo Editor",
  "Video Editor (Lead)", "VFX Supervisor",
]);

export const CREATIVE_TYPES = new Set([
  "Actor", "Model", "Voice Actor", "Dancer", "Performer", "Influencer",
  "Content Creator", "Streamer", "Host", "Presenter", "Spokesperson",
  "Photographer", "Videographer", "Cinematographer", "Director",
  "Camera Operator", "Drone Pilot", "FPV Pilot", "Steadicam Operator",
  "Musician", "Singer", "Composer", "Producer (Music)", "Audio Engineer",
  "Sound Designer", "Voice Over Artist", "DJ", "Beat Maker",
  "Editor", "Colorist", "VFX Artist", "Motion Designer", "Animator",
  "3D Artist", "Retoucher", "Post Producer", "Finishing Artist",
  "Designer", "Graphic Designer", "UI/UX Designer", "Art Director (Hands-on)",
  "Illustrator", "Concept Artist", "Storyboard Artist", "Set Designer",
  "Costume Designer", "Makeup Artist", "Hair Stylist", "Wardrobe Stylist",
  "Prop Master", "Production Designer",
  "Writer", "Screenwriter", "Copywriter", "Content Writer", "Journalist",
  "Script Supervisor", "Story Editor", "Creative Writer",
  "Production Assistant", "Production Coordinator", "Location Manager",
  "Casting Assistant", "Talent Manager", "Creative Assistant",
]);

// ── Role Types ───────────────────────────────────────────────────────────────

export type MuseRole = "muse" | "creative";

export type ViewerSide = "industry" | "creative";

// ── Detection Functions ──────────────────────────────────────────────────────

export function isIndustryType(type?: string | null): boolean {
  return MUSE_TYPES.has(String(type || "").trim());
}

export function isMuseType(type?: string | null): boolean {
  return MUSE_TYPES.has(String(type || "").trim());
}

export function isCreativeType(type?: string | null): boolean {
  return CREATIVE_TYPES.has(String(type || "").trim());
}

/** Returns the Muse role for a profile, preferring explicit audience field. */
export function getMuseRole(profile?: { audience?: string | null; type?: string | null } | null): MuseRole {
  const a = String(profile?.audience || "").trim().toLowerCase();
  if (a === "muse") return "muse";
  if (a === "creative") return "creative";
  // Also accept legacy "industry" as "muse"
  if (a === "industry") return "muse";

  const t = String(profile?.type || "").trim();
  if (isMuseType(t)) return "muse";
  if (isCreativeType(t)) return "creative";

  // Default to creative for backward compatibility
  return "creative";
}

/** Legacy compatibility — maps MuseRole back to ViewerSide. */
export function viewerSide(type?: string | null): ViewerSide {
  return isIndustryType(type) ? "industry" : "creative";
}

export function viewerSideOf(profile?: { audience?: string | null; type?: string | null } | null): ViewerSide {
  const a = String(profile?.audience || "").trim().toLowerCase();
  if (a === "industry" || a === "creative") return a as ViewerSide;
  if (a === "muse") return "industry";
  return viewerSide(profile?.type);
}

// ── Role Capabilities ────────────────────────────────────────────────────────

export const ROLE_CAPABILITIES = {
  muse: {
    canPostBriefs: true,
    canHireBook: true,
    canViewAnalytics: true,
    canManageTeams: true,
    canAccessIndustryTools: true,
    canPostJobs: true,
    canReviewPortfolios: true,
    canManageBudgets: true,
    defaultTabs: ["discover", "briefs", "network", "analytics"] as const,
    profileSections: ["portfolio", "briefs-posted", "team", "reviews-received", "hiring-history"] as const,
    dashboardWidgets: ["active-briefs", "applications", "team-performance", "budget-tracking", "industry-insights"] as const,
  },
  creative: {
    canApplyToBriefs: true,
    canShowcasePortfolio: true,
    canReceiveBookings: true,
    canTrackGigs: true,
    canAccessCreativeTools: true,
    canManageAvailability: true,
    canReceiveReviews: true,
    defaultTabs: ["discover", "connections", "briefs", "matches"] as const,
    profileSections: ["portfolio", "reel", "skills", "availability", "reviews", "collaborations"] as const,
    dashboardWidgets: ["upcoming-gigs", "portfolio-views", "applications", "earnings", "skill-growth"] as const,
  },
} as const;

export function getRoleCapabilities(role: MuseRole) {
  return ROLE_CAPABILITIES[role];
}

// ── Role-Aware Helpers ───────────────────────────────────────────────────────

/** Returns a role-specific string: museValue if muse, creativeValue if creative. */
export function roleSpecific<T>(role: MuseRole, museValue: T, creativeValue: T): T {
  return role === "muse" ? museValue : creativeValue;
}

/** Badge text for a role. */
export function roleBadgeText(role: MuseRole): string {
  return role === "muse" ? "✦ Muse" : "★ Creative";
}

/** Profile section labels differ by role. */
export function profileSectionLabel(role: MuseRole, section: string): string {
  const labels: Record<MuseRole, Record<string, string>> = {
    muse: {
      portfolio: "Portfolio & Work",
      "briefs-posted": "Briefs Posted",
      team: "Team",
      "reviews-received": "Reviews Received",
      "hiring-history": "Hiring History",
    },
    creative: {
      portfolio: "Portfolio",
      reel: "Reel & Demos",
      skills: "Skills & Specializations",
      availability: "Availability & Rates",
      reviews: "Reviews & Testimonials",
      collaborations: "Collaborations",
    },
  };
  return labels[role][section] || section;
}

/** Nav tab labels differ by role. */
export function navTabLabel(role: MuseRole, tab: string): string {
  const labels: Record<MuseRole, Record<string, string>> = {
    muse: {
      discover: "Scout",
      connections: "Feed",
      briefs: "Briefs",
      matches: "Talent",
      bts: "BTS",
    },
    creative: {
      discover: "Discover",
      connections: "Feed",
      briefs: "Collab",
      matches: "Muses",
      bts: "BTS",
    },
  };
  return labels[role][tab] || tab;
}

/** Call-to-action text for a role. */
export function ctaText(role: MuseRole, action: "message" | "apply" | "book" | "hire"): string {
  const ctas: Record<MuseRole, Record<string, string>> = {
    muse: {
      message: "Reach Out",
      apply: "View Application",
      book: "Book Now",
      hire: "Hire",
    },
    creative: {
      message: "Message",
      apply: "Apply",
      book: "Request Booking",
      hire: "Pitch",
    },
  };
  return ctas[role][action] || action;
}

/** Empty-state text differs by role. */
export function emptyStateText(role: MuseRole, context: string): { title: string; subtitle: string } {
  const states: Record<MuseRole, Record<string, { title: string; subtitle: string }>> = {
    muse: {
      matches: { title: "No Talent Yet", subtitle: "Start scouting to find talent for your projects" },
      briefs: { title: "No Briefs Posted", subtitle: "Post your first brief to attract talent" },
      network: { title: "Network Empty", subtitle: "Connect with creatives and industry professionals" },
    },
    creative: {
      matches: { title: "No Muses Yet", subtitle: "Keep swiping to find your matches" },
      briefs: { title: "No Collabs Yet", subtitle: "Apply to briefs to start collaborating" },
      network: { title: "Network Empty", subtitle: "Connect with other creatives and industry pros" },
    },
  };
  return states[role][context] || { title: "Nothing Here", subtitle: "Check back later" };
}
