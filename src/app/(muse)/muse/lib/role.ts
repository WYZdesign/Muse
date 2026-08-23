// Muses ↔ Creatives duality — Phase 0 role detection.
// Industry = hires/books/pays. Creative = gets hired/does the work.
const INDUSTRY_TYPES = new Set([
  "Casting Director", "Art Buyer", "Fine Art Agent", "Producer",
  "Creative Director", "Brand", "Agency",
]);

export function isIndustryType(type?: string | null): boolean {
  return INDUSTRY_TYPES.has(String(type || "").trim());
}

export type ViewerSide = "industry" | "creative";

export function viewerSide(type?: string | null): ViewerSide {
  return isIndustryType(type) ? "industry" : "creative";
}
