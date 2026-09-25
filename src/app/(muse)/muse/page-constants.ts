export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "info@wyzdesign.com";
export const OWNER_EMAIL = process.env.NEXT_PUBLIC_OWNER_EMAIL || "torree.marcel@gmail.com";

// Demo scaffolding defaults on until the owner separately approves public launch.
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

// Mirrors server policy for client-side staleness messaging only; server remains
// the enforcement boundary.
export const AGE_VERIFICATION_VALID_DAYS = 150;

export type MatchVariant = {
  title: string;
  symbol: string;
  particles: string[];
  gradient: string;
  particleColor: string;
};

export const MATCH_VARIANTS: MatchVariant[] = [
  { title: "It's a Connection!", symbol: "✨", particles: ["✦", "✧", "⭑", "⋆"], gradient: "linear-gradient(120deg,var(--gold),var(--amber),var(--sunset-orange),var(--gold))", particleColor: "var(--gold)" },
  { title: "It's a Match!", symbol: "★", particles: ["★", "☆", "✦"], gradient: "linear-gradient(120deg,var(--pink),var(--coral),var(--gold),var(--pink))", particleColor: "var(--coral)" },
  { title: "Creative Match!", symbol: "🎨", particles: ["🎨", "✦", "⭑"], gradient: "linear-gradient(120deg,var(--lavender),var(--pink),var(--gold),var(--lavender))", particleColor: "var(--lavender)" },
  { title: "Let's Collaborate!", symbol: "🤝", particles: ["✦", "⋆", "✧"], gradient: "linear-gradient(120deg,var(--sky),var(--mint),var(--gold),var(--sky))", particleColor: "var(--sky)" },
  { title: "New Connection!", symbol: "⚡", particles: ["⚡", "✦", "⭑"], gradient: "linear-gradient(120deg,var(--honey),var(--amber),var(--coral),var(--honey))", particleColor: "var(--honey)" },
  { title: "Match Made!", symbol: "🌟", particles: ["🌟", "★", "✧"], gradient: "linear-gradient(120deg,var(--golden-rose),var(--pink),var(--lavender),var(--golden-rose))", particleColor: "var(--golden-rose)" },
  { title: "Time to Create!", symbol: "🎬", particles: ["✦", "⋆", "✧"], gradient: "linear-gradient(120deg,var(--sunset),var(--gold),var(--peach),var(--sunset))", particleColor: "var(--sunset)" },
  { title: "Connection Found!", symbol: "🔗", particles: ["✦", "⭑", "✧"], gradient: "linear-gradient(120deg,var(--mint),var(--sky),var(--lavender),var(--mint))", particleColor: "var(--mint)" },
  { title: "You're a Match!", symbol: "💫", particles: ["💫", "✦", "⭑"], gradient: "linear-gradient(120deg,var(--warm-cream),var(--gold),var(--amber),var(--warm-cream))", particleColor: "var(--gold)" },
  { title: "Collab Unlocked!", symbol: "🎉", particles: ["🎉", "✦", "⋆"], gradient: "linear-gradient(120deg,var(--coral),var(--peach),var(--gold),var(--coral))", particleColor: "var(--coral)" },
];
