"use client";

// LA studio showcase registry. Tabs let users browse whole studios (FD + 2 others
// most similar/different to FD), and each studio's sub-tabs walk through its
// spaces, info, FAQs. Booking links go to each studio's own booking page — the
// direct-integration deal is a future step; for now this showcases + markets.
// NOTE: 2 other studio slots are real, well-known LA providers so the tabs
// render with real data; swap in your actual partner studios once deals are set.

export interface StudioSpace {
  id: string;
  name: string;
  feature: string;
  price: string;
  slug: string; // directs to studio's own booking/rental page
  img?: string; // local gallery image under /public/studio/<Building>/Stage_<N>.webp
}

export interface StudioBuilding {
  id: string;
  label: string;
  phone: string;
  hours: string;
  emoji: string;
  studios: StudioSpace[];
}

export interface StudioProfile {
  id: string;
  name: string;
  tagline: string;
  color: [string, string]; // gradient accent for the tab/card
  siteUrl: string;
  // "oracle" = FAQs / knowledge this studio's tab can answer from (FD has its
  // scraped guide; others start with general notes).
  oracle: { q: string; a: string }[];
  // "rules" = detailed client guide (booking, check-in, fees, house rules) shown
  // as a collapsible dropdown in this studio's tab.
  rules?: { icon: string; title: string; items: string[] }[];
  buildings: StudioBuilding[];
}

const FD_BASE = "https://www.fdphotostudio.com";

export const FD_STUDIO: StudioProfile = {
  id: "fd",
  name: "FD Photo Studio",
  tagline: "LA's largest studio network — 6 buildings, 30+ stages, from $29.99/hr",
  color: ["#E91E63", "#9C27B0"],
  siteUrl: FD_BASE,
  oracle: [
    { q: "How does booking work?", a: "Pick a studio, check availability, submit a request. FD confirms details and issues a payment link — you have 48 hrs to pay (unless last-minute). Pay → confirmation email with your access code + entry instructions. Help: 844-644-3377." },
    { q: "When does my time slot start?", a: "Self check-in with your access code. It activates 10 min before your slot and deactivates 10 min after. Your time includes setup, the shoot, and breakdown." },
    { q: "What's included?", a: "Most stages have 3x AlienBees 800 lights on C-stands, modifiers, sandbags, apple boxes, makeup station, clothing racks, steamer, sound system, Wi-Fi, mini-fridge. Fog machine $15/hr. Specialty stages (cars, cyc, water, rain) vary." },
    { q: "Can I save money with packages?", a: "4/8/12-hr packs save ~11%/22%/33% vs hourly. Pack hours never expire, split across sessions, and lock the price. Fractional hours bill as a full hour." },
    { q: "What are the fees?", a: "5% card / 4% PayPal (or Venmo @FD-Studios). $7.50 utilities per booking. $75 late exit. Group of 10 included, $5/person extra. Overnight past 11pm needs a $525 deposit." },
    { q: "What's the cancellation policy?", a: "48+ hrs → full refund. 24–48 hrs → 50%. Under 24 hrs → non-refundable. Nothing refunded once the rental starts (except unsuitable + leave within 15 min)." },
    { q: "Any house rules?", a: "Leave it as you found it, no alcohol/smoking, no pyrotechnics, $500 fine for drugs/alcohol, hard-to-clean materials need advance approval + deposit. Not soundproof — keep music reasonable." },
  ],
  rules: [
    { icon: "🧾", title: "How booking works", items: ["Pick a studio, check availability, submit a request. FD confirms + issues a payment link — 48 hrs to pay (unless last-minute).", "On payment you get a confirmation email with your access code + entry instructions. Help: 844-644-3377."] },
    { icon: "🎟️", title: "Check-in & your time slot", items: ["Self check-in via access code — no key pickup. Code activates 10 min before your slot and deactivates 10 min after.", "Your time includes setup, the shoot, and breakdown. Every stage is private with a lockable door."] },
    { icon: "💡", title: "What's included", items: ["Most stages: 3x AlienBees 800 lights on C-stands + modifiers, sandbags, apple boxes, makeup station, clothing racks, steamer.", "Bluetooth/aux sound system, Wi-Fi, mini-fridge. Fog machine $15/hr (reserve ahead). Specialty stages vary."] },
    { icon: "💰", title: "Hourly vs packages — save money", items: ["4/8/12-hr packs save ~11%/22%/33% vs hourly. Pack hours never expire, split across sessions.", "Any fraction of an hour is billed as a full hour."] },
    { icon: "🖼️", title: "Backdrops & extras", items: ["Paper backdrop free. One sweep $29.99, more $59, full roll $75.", "Cyc repaint: small $75, large $100. Setup with a car on the cyc $150. Call about amperage for your own gear."] },
    { icon: "🧾", title: "Fees & fine print", items: ["5% card / 4% PayPal (or Venmo @FD-Studios). $7.50 utilities per booking.", "$75 late exit. Cleaning after a big mess from $150. Group of 10 included, $5/person extra. Overnight past 11pm needs a $525 deposit."] },
    { icon: "↩️", title: "Cancellation & refunds", items: ["48+ hrs → full refund. 24–48 hrs → 50%. Under 24 hrs → non-refundable.", "No refund once the rental starts (except unsuitable + leave within 15 min)."] },
    { icon: "⚠️", title: "House rules", items: ["Leave it as you found it. No alcohol/smoking/pyrotechnics/firearms. $500 fine for drugs or alcohol.", "Hard-to-clean materials (confetti, flour, body oil, fake blood) need approval + deposit. Studios are not soundproof."] },
  ],
  buildings: [
    { id: "main", label: "Main Building", phone: "+1 (323) 454-2323", hours: "24 hrs / 7 days", emoji: "🌆", studios: [
      { id: "studio-a", name: "Studio A", feature: "Classic · 1000 sq ft + lots of natural light", slug: "studio-a", price: "$34.99" },
      { id: "studio-b", name: "Studio B", feature: "Blackout · black walls & ceiling", slug: "studio-b", price: "$34.99" },
      { id: "studio-c", name: "Studio C", feature: "Large stage · 19 ft Cyc Wall", slug: "studio-c", price: "$49.99" },
      { id: "studio-d", name: "Studio D", feature: "1800 sq ft daylight · North & West windows", slug: "studio-d", price: "$44.99" },
      { id: "studio-e", name: "Studio E", feature: "Daylight · soft light + 3 big windows", slug: "studio-e", price: "$34.99" },
      { id: "studio-f", name: "Studio F", feature: "Downtown skyline views · 2-zone laminate floor", slug: "studio-f", price: "$34.99" },
    ] },
    { id: "art", label: "Art Building", phone: "+1 (213) 536-5631", hours: "24 hrs / 7 days", emoji: "🎨", studios: [
      { id: "art-1", name: "Art 1", feature: "White Steps · NW windows, stairs to window, DT views", slug: "art-1", price: "$54.99" },
      { id: "art-2", name: "Art 2", feature: "Wood Floor · real wood, brick wall, podium", slug: "art-2", price: "$44.99" },
      { id: "art-3", name: "Art 3", feature: "Flower Wall · gold furniture, drapes, bath tub", slug: "art-3", price: "$44.99" },
      { id: "art-4", name: "Art 4", feature: "Wood Corner · dark wood corner, marquee star", slug: "art-4", price: "$44.99" },
    ] },
    { id: "hill", label: "Hill Building", phone: "+1 (213) 536-8030", hours: "24 hrs / 7 days", emoji: "🏔️", studios: [
      { id: "hill-1", name: "Hill 1", feature: "White Floor · queen wooden bed + baldachin", slug: "hill-1", price: "$39.99" },
      { id: "hill-2", name: "Hill 2", feature: "Light Wall · true blackout, dimmable light wall", slug: "hill-2", price: "$39.99" },
      { id: "hill-3", name: "Hill 3", feature: "Mirror Wall · full mirror wall, white brick", slug: "hill-3", price: "$44.99" },
      { id: "hill-4", name: "Hill 4", feature: "Tuscan/Jungle · corner stage + Vespa scooter", slug: "hill-4", price: "$39.99" },
      { id: "hill-5", name: "Hill 5", feature: "Pink Wall · romantic white stage + French wall", slug: "hill-5", price: "$29.99" },
      { id: "hill-6", name: "Hill 6", feature: "Moroccan Shower · shower, bathtub, lots of props", slug: "hill-6", price: "$44.99" },
      { id: "hill-7", name: "Hill 7", feature: "Rain Room · aqua stage, rain feature + platform", slug: "hill-7", price: "$44.99" },
      { id: "hill-8", name: "Hill 8", feature: "Concrete Wall · phone booth, rusted wall, barn doors", slug: "hill-8", price: "$34.99" },
    ] },
    { id: "loft", label: "LA Lofts", phone: "+1 (323) 997-8644", hours: "8 AM – 11 PM", emoji: "🏠", studios: [
      { id: "la-loft-1", name: "LA Loft 1", feature: "French Loft · bedroom + living room sets", slug: "la-loft-1", price: "$54.99" },
      { id: "la-loft-2", name: "LA Loft 2", feature: "Scandinavian · gorgeous loft styling", slug: "la-loft-2", price: "$39.99" },
      { id: "la-loft-3", name: "LA Loft 3", feature: "French Manor · kitchen, dining, seamstress area", slug: "la-loft-3", price: "$44.99" },
      { id: "la-loft-4", name: "LA Loft 4", feature: "Man Cave · RGB screen, pool table, leather", slug: "la-loft-4", price: "$39.99" },
      { id: "la-loft-5", name: "LA Loft 5", feature: "Sunny Loft · daylight + downtown view", slug: "la-loft-5", price: "$49.99" },
      { id: "la-loft-6", name: "LA Loft 6", feature: "Sunset Cycwall · daylight + afternoon light", slug: "la-loft-6", price: "$49.99" },
    ] },
    { id: "olympic", label: "Olympic Building", phone: "+1 (323) 968-1089", hours: "24 hrs / 7 days", emoji: "🏅", studios: [
      { id: "olympic-1", name: "Olympic 1", feature: "Underwater · pool + shower, RGB tunnel, roll-up door", slug: "olympic-1", price: "$125" },
      { id: "olympic-2", name: "Olympic 2", feature: "Black Cyc-wall · car studio, cyc wall + rain", slug: "olympic-2", price: "$54.99" },
      { id: "olympic-3", name: "Olympic 3", feature: "Car Turntable · white cycwall, car access", slug: "olympic-3", price: "$44.99" },
      { id: "olympic-4", name: "Olympic 4", feature: "Private Jet · full jet interior", slug: "olympic-4", price: "$34.99" },
      { id: "olympic-5", name: "Olympic 5", feature: "Metal Garage · 3600 sq ft, car access, textures", slug: "olympic-5", price: "$54.99" },
    ] },
  ],
};

// 2 other LA studios so the browser-tabs behavior is real. Swap in partner
// studios once deals are agreed (keep the same StudioProfile shape).
export const OTHER_STUDIOS: StudioProfile[] = [
  {
    id: "apex",
    name: "Apex Photo Studios",
    tagline: "Downtown LA · affordable hourly multi-set rentals, integrated lighting/grip, versatile cyc walls",
    color: ["#F4511E", "#FFB300"],
    siteUrl: "https://maps.google.com/?q=Apex+Photo+Studios+Los+Angeles",
    oracle: [
      { q: "What's Apex known for?", a: "Affordable hourly multi-set studio rentals in Downtown LA with integrated lighting and grip packages and versatile cyc walls — very close to FD's self-service hourly model." },
      { q: "How do I book?", a: "Apex is ready to showcase — final site/gallery data and booking link are pending the partnership. Contact them via the listing to arrange a shoot." },
    ],
    buildings: [
      { id: "apex-1", label: "Downtown LA", phone: "213-255-5000", hours: "Self-service hourly", emoji: "🏙️", studios: [
        { id: "apex-set-1", name: "Apex Multi-Set", feature: "Multiple sets · cyc walls · integrated lighting & grip", slug: "multi-set", price: "hourly" },
        { id: "apex-cyc", name: "Cyc Wall Studio", feature: "Versatile white/black cyc — close to FD's setup", slug: "cyc", price: "hourly" },
      ] },
    ],
  },
  {
    id: "hubble",
    name: "Hubble Studio",
    tagline: "Arts District · flexible modular self-service boutique spaces for fashion, portrait, commercial",
    color: ["#1E88E5", "#00E5FF"],
    siteUrl: "https://www.hubblestudio.com",
    oracle: [
      { q: "What's Hubble known for?", a: "Flexible, modular boutique-style studio spaces in the Arts District designed for fashion, portrait, and commercial creators who want self-service hourly configurations — similar to FD." },
      { q: "How do I book?", a: "Book via Hubble's site (hubblestudio.com). Full space gallery + booking embed pending the partnership." },
    ],
    buildings: [
      { id: "hubble-1", label: "Arts District", phone: "213-555-0168", hours: "Self-service hourly", emoji: "🎨", studios: [
        { id: "hubble-mod", name: "Modular Space", feature: "Fashion / portrait / commercial · flexible setup", slug: "modular", price: "hourly" },
        { id: "hubble-boutique", name: "Boutique Stage", feature: "Self-service hourly · customizable", slug: "boutique", price: "hourly" },
      ] },
    ],
  },
];

// Assign local gallery images. FD buildings publish their images under
// /public/studio/<Building>/Stage_<N|Letter>.webp (curated from G:\My Drive\Videos\FD Events).
// Map each FD studio space to its stage's image; Main uses letters, others use numbers.
const FD_IMG_MAP: Record<string, { folder: string; stages: Record<string, string> }> = {
  main: { folder: "Main", stages: { "studio-a": "Stage_A", "studio-b": "Stage_B", "studio-c": "Stage_C", "studio-d": "Stage_D", "studio-e": "Stage_E", "studio-f": "Stage_F" } },
  art: { folder: "Art", stages: { "art-1": "Stage_1", "art-2": "Stage_2", "art-3": "Stage_3", "art-4": "Stage_4" } },
  hill: { folder: "Hill", stages: { "hill-1": "Stage_1", "hill-2": "Stage_2", "hill-3": "Stage_3", "hill-4": "Stage_4", "hill-5": "Stage_5", "hill-6": "Stage_6", "hill-7": "Stage_7", "hill-8": "Stage_8" } },
  loft: { folder: "Loft", stages: { "la-loft-1": "Stage_1", "la-loft-2": "Stage_2", "la-loft-3": "Stage_3", "la-loft-4": "Stage_4", "la-loft-5": "Stage_5", "la-loft-6": "Stage_6" } },
  olympic: { folder: "Olympic", stages: { "olympic-1": "Stage_1", "olympic-2": "Stage_2", "olympic-3": "Stage_3", "olympic-4": "Stage_4", "olympic-5": "Stage_5" } },
  yukon: { folder: "Yukon", stages: { "yukon-1": "Stage_1", "yukon-2": "Stage_2", "yukon-3": "Stage_3", "yukon-4": "Stage_4", "yukon-5": "Stage_5" } },
};
for (const b of FD_STUDIO.buildings) {
  const cfg = FD_IMG_MAP[b.id];
  if (!cfg) continue;
  for (const s of b.studios) {
    const stage = cfg.stages[s.id];
    if (stage) { s.img = `/studio/${cfg.folder}/${stage}.webp`; }
  }
  if (b.studios[0]?.img) (b as any).img = b.studios[0].img;
}

export const ALL_STUDIOS = [FD_STUDIO, ...OTHER_STUDIOS];
