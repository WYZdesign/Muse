/**
 * Creates a deterministic, network-free avatar for profiles without a photo.
 *
 * Keeping this outside the page shell makes the fallback reusable by screens
 * and prevents a presentational utility from inflating the client controller.
 */
export function initialsAvatarUrl(name: string, key: string | number): string {
  const normalizedName = (name || "M").trim();
  const letters = (normalizedName
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] || "")
    .join("") || "M").toUpperCase();
  const seed = String(key) + normalizedName;
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  const firstColor = `hsl(${hash % 360},68%,52%)`;
  const secondColor = `hsl(${(hash * 7 + 40) % 360},62%,34%)`;

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='${firstColor}'/><stop offset='1' stop-color='${secondColor}'/></linearGradient></defs><rect width='200' height='200' fill='url(#g)'/><text x='100' y='102' font-family='Inter,Arial,sans-serif' font-size='82' font-weight='700' fill='white' text-anchor='middle' dominant-baseline='central'>${letters}</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
