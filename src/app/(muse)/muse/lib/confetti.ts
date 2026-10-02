/**
 * P2 extraction: confetti piece generator, moved out of page.tsx.
 * Random positions/sizes/colors for the match-confetti animation.
 */
export function makeConfettiPieces() {
  return Array.from({ length: 40 }).map((_, i) => ({
    left: Math.random() * 100 + "%",
    width: (Math.random() * 6 + 4) + "px",
    height: (Math.random() * 8 + 6) + "px",
    background: ["var(--gold)", "var(--amber)", "var(--pink)", "var(--lavender)", "var(--coral)", "var(--mint)", "#fff"][i % 7],
    animationDuration: (Math.random() * 2 + 2) + "s",
    animationDelay: Math.random() * 1.5 + "s",
    "--drift": (Math.random() * 120 - 60) + "px",
    "--rot": (Math.random() * 720) + "deg"
  }));
}
