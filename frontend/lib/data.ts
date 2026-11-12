export type Product = {
  /** Slug used in URLs. */
  id: string;
  /**
   * Numeric primary key from the API. Cart, wishlist and checkout address
   * pieces by this id, so anything that has to reach the backend needs a
   * product that came from `mapProduct`. Static catalog rows have none.
   */
  backendId?: number;
  /** Seller's account id, when the seller has one — used to start a chat. */
  sellerUserId?: number;
  name: string;
  seller: string;
  price: string;
  priceValue: number;
  image: string;
  /** All listing photos in display order, `image` first. Falls back to
   * just `[image]` for static/mock rows that don't set this. */
  images?: string[];
  category: CategorySlug;
  department: DepartmentSlug;
  room: RoomSlug;
  description: string;
  condition: string;
  dimensions: string;
  era: string;
  collection?: "editors-picks" | "collectors-edit" | "just-listed";
  listedAt: string; // ISO date for sort=newest
};

export type CategorySlug =
  | "chairs"
  | "sofas"
  | "tables"
  | "lighting"
  | "rugs"
  | "art"
  | "mirrors"
  | "decoration"
  | "cupboards"
  | "beds"
  | "storage"
  | "desks"
  | "vases"
  | "cushions"
  | "books"
  | "objects"
  | "floor-lamps"
  | "pendant-lights"
  | "table-lamps"
  | "sconces"
  | "chandeliers"
  | "paintings"
  | "prints"
  | "sculptures"
  | "photography"
  | "ceramics";

export type DepartmentSlug = "furniture" | "decoration" | "lighting" | "art";

export type RoomSlug = "living-room" | "bedroom" | "dining-room";

export type Category = {
  name: string;
  slug: CategorySlug;
  image: string;
  href: string;
  description: string;
};

export type Room = {
  name: string;
  slug: RoomSlug;
  image: string;
  href: string;
  description: string;
};

export type Article = {
  slug: string;
  tag: string;
  title: string;
  excerpt: string;
  image: string;
  href: string;
  date: string;
  body: string[];
};

export type ValueProp = { symbol: string; title: string; body: string };

export type FooterLink = { label: string; href: string };

export type Department = {
  slug: DepartmentSlug;
  name: string;
  eyebrow: string;
  title: string;
  lead: string;
  categories: CategorySlug[];
  heroImage?: string;
  shopFilters?: { slug: string; label: string }[];
};

export const navLinks = [
  { label: "Home", href: "/" },
  { label: "Shop All", href: "/shop" },
  { label: "Furniture", href: "/furniture" },
  { label: "Decoration", href: "/decoration" },
  { label: "Lighting", href: "/lighting" },
  { label: "Art", href: "/art" },
  { label: "About", href: "/about" },
  { label: "How It Works", href: "/how-it-works" },
];

export const departments: Department[] = [
  {
    slug: "furniture",
    name: "Furniture",
    eyebrow: "Shop",
    title: "Furniture",
    lead: "Chairs, sofas, tables, and case pieces with character — sourced from private homes across Egypt.",
    categories: ["chairs", "sofas", "tables"],
    heroImage: "/images/furniture-hero.png",
    shopFilters: [
      { slug: "all", label: "All" },
      { slug: "chairs", label: "Chairs" },
      { slug: "tables", label: "Tables" },
      { slug: "sofas", label: "Sofas" },
      { slug: "cupboards", label: "Cupboards" },
      { slug: "beds", label: "Beds" },
      { slug: "storage", label: "Storage" },
      { slug: "desks", label: "Desks" },
    ],
  },
  {
    slug: "decoration",
    name: "Decoration",
    eyebrow: "Shop",
    title: "Decoration",
    lead: "Rugs, mirrors, and finishing pieces that give a room its quiet signature.",
    categories: ["rugs", "mirrors", "vases"],
    heroImage: "/images/decoration-hero.png",
    shopFilters: [
      { slug: "all", label: "All" },
      { slug: "rugs", label: "Rugs" },
      { slug: "mirrors", label: "Mirrors" },
      { slug: "vases", label: "Vases" },
      { slug: "cushions", label: "Cushions" },
      { slug: "books", label: "Books" },
      { slug: "objects", label: "Objects" },
    ],
  },
  {
    slug: "lighting",
    name: "Lighting",
    eyebrow: "Shop",
    title: "Lighting",
    lead: "Floor lamps, pendants, and chandeliers that cast warmth as much as light.",
    categories: ["lighting"],
    heroImage: "/images/lighting-hero.png",
    shopFilters: [
      { slug: "all", label: "All" },
      { slug: "floor-lamps", label: "Floor Lamps" },
      { slug: "pendant-lights", label: "Pendant Lights" },
      { slug: "table-lamps", label: "Table Lamps" },
      { slug: "sconces", label: "Sconces" },
      { slug: "chandeliers", label: "Chandeliers" },
    ],
  },
  {
    slug: "art",
    name: "Art",
    eyebrow: "Shop",
    title: "Art",
    lead: "Paintings and portraits chosen for presence — framed stories for considered walls.",
    categories: ["art"],
    heroImage: "/images/art-hero.png",
    shopFilters: [
      { slug: "all", label: "All" },
      { slug: "paintings", label: "Paintings" },
      { slug: "prints", label: "Prints" },
      { slug: "sculptures", label: "Sculptures" },
      { slug: "photography", label: "Photography" },
      { slug: "ceramics", label: "Ceramics" },
    ],
  },
];

export const catalog: Product[] = [
  {
    id: "louis-xv-bergere-armchair",
    name: "Louis XV Bergère Armchair",
    seller: "Layla Hassan",
    price: "EGP 8,500",
    priceValue: 8500,
    image: "/images/louis-xv-bergere-armchair.png",
    category: "chairs",
    department: "furniture",
    room: "living-room",
    description:
      "A classic bergère with carved walnut frame and soft upholstery. Ideal as a statement seat beside a fireplace or reading nook.",
    condition: "Excellent — minor wear on seat edge",
    dimensions: "W 72 × D 68 × H 96 cm",
    era: "Louis XV revival, mid-20th century",
    collection: "just-listed",
    listedAt: "2026-07-10",
  },
  {
    id: "art-deco-brass-floor-lamp",
    name: "Art Deco Brass Floor Lamp",
    seller: "Omar Farouk",
    price: "EGP 3,200",
    priceValue: 3200,
    image: "/images/art-deco-brass-floor-lamp.png",
    category: "lighting",
    department: "lighting",
    room: "living-room",
    description:
      "Tall brass stem with a clean Deco silhouette. Warm ambient light for evenings and layered interiors.",
    condition: "Very good — light patina on base",
    dimensions: "H 158 cm, base Ø 28 cm",
    era: "Art Deco, c. 1930s–40s style",
    collection: "just-listed",
    listedAt: "2026-07-11",
  },
  {
    id: "mid-century-teak-credenza",
    name: "Mid-Century Teak Credenza",
    seller: "Nour Khalil",
    price: "EGP 12,000",
    priceValue: 12000,
    image: "/images/mid-century-teak-credenza.png",
    category: "tables",
    department: "furniture",
    room: "dining-room",
    description:
      "Long teak sideboard with sliding doors and generous storage. A grounding piece for dining rooms and open living spaces.",
    condition: "Excellent — original finish retained",
    dimensions: "W 180 × D 45 × H 78 cm",
    era: "Mid-century, c. 1960s",
    collection: "just-listed",
    listedAt: "2026-07-12",
  },
  {
    id: "antique-persian-kilim-rug",
    name: "Antique Persian Kilim Rug",
    seller: "Dina Mostafa",
    price: "EGP 6,800",
    priceValue: 6800,
    image: "/images/antique-persian-kilim-rug.png",
    category: "rugs",
    department: "decoration",
    room: "living-room",
    description:
      "Handwoven kilim with geometric fields and softened earth tones. Flatweave that layers beautifully under furniture.",
    condition: "Good — gentle fade consistent with age",
    dimensions: "210 × 145 cm",
    era: "Persian, early–mid 20th century",
    collection: "just-listed",
    listedAt: "2026-07-09",
  },
  {
    id: "french-empire-gilt-mirror",
    name: "French Empire Gilt Mirror",
    seller: "Youssef Adel",
    price: "EGP 4,500",
    priceValue: 4500,
    image: "/images/french-empire-gilt-mirror.png",
    category: "mirrors",
    department: "decoration",
    room: "bedroom",
    description:
      "Ornate gilt frame with classical detailing. Reflects light and adds ceremony above a console or dresser.",
    condition: "Very good — small chips to gilding on lower edge",
    dimensions: "W 68 × H 95 cm",
    era: "French Empire style",
    collection: "editors-picks",
    listedAt: "2026-06-28",
  },
  {
    id: "classic-vases",
    name: "Classic Vases",
    seller: "Youssef Adel",
    price: "EGP 4,500",
    priceValue: 4500,
    image: "/images/classic-vases.png",
    category: "vases",
    department: "decoration",
    room: "living-room",
    description:
      "Hand-thrown ceramic vessel with a weathered glaze and rustic patina. A sculptural accent for shelves and side tables.",
    condition: "Excellent — natural texture and glaze variation",
    dimensions: "H 32 × W 18 cm",
    era: "Artisan contemporary",
    listedAt: "2026-07-18",
  },
  {
    id: "vintage-rattan-peacock-chair",
    name: "Vintage Rattan Peacock Chair",
    seller: "Sara Mansour",
    price: "EGP 2,800",
    priceValue: 2800,
    image: "/images/vintage-rattan-peacock-chair.png",
    category: "chairs",
    department: "furniture",
    room: "bedroom",
    description:
      "Fan-backed rattan peacock chair with a sculptural silhouette. Softens corners and photographs beautifully.",
    condition: "Good — tight weave, slight darkening",
    dimensions: "W 95 × D 70 × H 140 cm",
    era: "1970s",
    collection: "editors-picks",
    listedAt: "2026-06-30",
  },
  {
    id: "crystal-brass-chandelier",
    name: "Crystal & Brass Chandelier",
    seller: "Karim Nabil",
    price: "EGP 5,500",
    priceValue: 5500,
    image: "/images/crystal-brass-chandelier.png",
    category: "lighting",
    department: "lighting",
    room: "dining-room",
    description:
      "Brass frame with crystal drops — glittering above a dining table or in a tall hallway.",
    condition: "Excellent — fully rewired",
    dimensions: "Ø 55 × H 62 cm (chain adjustable)",
    era: "Mid-century European",
    collection: "editors-picks",
    listedAt: "2026-07-01",
  },
  {
    id: "floral-oil-painting-in-gilt-frame",
    name: "Floral Oil Painting in Gilt Frame",
    seller: "Mona Aziz",
    price: "EGP 9,200",
    priceValue: 9200,
    image: "/images/floral-oil-painting-in-gilt-frame.png",
    category: "art",
    department: "art",
    room: "living-room",
    description:
      "Still-life florals in oil, set in a substantial gilt frame. Instant warmth for a living wall or landing.",
    condition: "Very good — stable craquelure",
    dimensions: "W 78 × H 92 cm (framed)",
    era: "Early 20th century",
    collection: "editors-picks",
    listedAt: "2026-07-02",
  },
  {
    id: "victorian-chaise-longue",
    name: "Victorian Chaise Longue",
    seller: "Hana Fouad",
    price: "EGP 15,500",
    priceValue: 15500,
    image: "/images/victorian-chaise-longue.png",
    category: "sofas",
    department: "furniture",
    room: "bedroom",
    description:
      "Elegant chaise with carved legs and deep seating. Made for reading corners and quiet bedrooms.",
    condition: "Good — upholstery refreshed; frame original",
    dimensions: "W 165 × D 70 × H 88 cm",
    era: "Victorian, late 19th century style",
    collection: "collectors-edit",
    listedAt: "2026-06-20",
  },
  {
    id: "murano-glass-pendant-chandelier",
    name: "Murano Glass Pendant Chandelier",
    seller: "Lina Sami",
    price: "EGP 22,000",
    priceValue: 22000,
    image: "/images/murano-glass-pendant-chandelier.png",
    category: "lighting",
    department: "lighting",
    room: "dining-room",
    description:
      "Hand-blown Murano glass pendant with layered forms. A rare centrepiece for dining rooms that deserve drama.",
    condition: "Excellent — original canopy included",
    dimensions: "Ø 48 × H 55 cm",
    era: "Murano, mid–late 20th century",
    collection: "collectors-edit",
    listedAt: "2026-06-18",
  },
  {
    id: "regency-rosewood-console-table",
    name: "Regency Rosewood Console Table",
    seller: "Ahmed Bakr",
    price: "EGP 7,800",
    priceValue: 7800,
    image: "/images/regency-rosewood-console-table.png",
    category: "tables",
    department: "furniture",
    room: "living-room",
    description:
      "Slim rosewood console with tapered legs — perfect behind a sofa or in an entryway.",
    condition: "Very good — polished surface with light marks",
    dimensions: "W 110 × D 38 × H 80 cm",
    era: "Regency style",
    listedAt: "2026-06-22",
  },
  {
    id: "glass-cabinet-pantry",
    name: "Glass cabinet",
    seller: "Hana Fouad",
    price: "EGP 15,500",
    priceValue: 15500,
    image: "/images/glass-cabinet-pantry.png",
    category: "cupboards",
    department: "furniture",
    room: "dining-room",
    description:
      "Built-in pantry with glass doors and warm oak interiors. Organised storage with a clean, architectural presence.",
    condition: "Excellent — recently installed",
    dimensions: "W 120 × D 60 × H 240 cm",
    era: "Contemporary",
    listedAt: "2026-07-20",
  },
  {
    id: "glass-cabinet-apothecary",
    name: "Glass cabinet",
    seller: "Hana Fouad",
    price: "EGP 15,500",
    priceValue: 15500,
    image: "/images/glass-cabinet-apothecary.png",
    category: "cupboards",
    department: "furniture",
    room: "living-room",
    description:
      "Victorian apothecary cabinet with glass-fronted upper cases and labelled drawers below.",
    condition: "Very good — original glass and hardware",
    dimensions: "W 280 × D 45 × H 220 cm",
    era: "Victorian, late 19th century",
    listedAt: "2026-07-21",
  },
  {
    id: "twin-hotel-beds",
    name: "beds",
    seller: "Ahmed Fouad",
    price: "EGP 14,500",
    priceValue: 14500,
    image: "/images/twin-hotel-beds.png",
    category: "beds",
    department: "furniture",
    room: "bedroom",
    description:
      "Pair of twin beds with tufted headboards and crisp hotel-style linens. Elegant and ready to place.",
    condition: "Excellent — professionally maintained",
    dimensions: "W 100 × L 200 cm each",
    era: "Classic hospitality style",
    listedAt: "2026-07-22",
  },
  {
    id: "desks-classic",
    name: "Desks Classic",
    seller: "Nour Khalil",
    price: "EGP 12,000",
    priceValue: 12000,
    image: "/images/desks-classic.png",
    category: "desks",
    department: "furniture",
    room: "living-room",
    description:
      "Dark wood writing desk with carved details and a high-backed companion chair. A proper study setup.",
    condition: "Good — rich patina on the surface",
    dimensions: "W 150 × D 75 × H 78 cm",
    era: "Edwardian style",
    listedAt: "2026-07-23",
  },
  {
    id: "antique-portrait-in-gilded-frame",
    name: "Antique Portrait in Gilded Frame",
    seller: "Mona Aziz",
    price: "EGP 11,500",
    priceValue: 11500,
    image: "/images/antique-portrait-in-gilded-frame.png",
    category: "art",
    department: "art",
    room: "living-room",
    description:
      "Oil portrait with a quiet gaze, housed in a gilded period frame. Presence without noise.",
    condition: "Good — age-appropriate varnish tone",
    dimensions: "W 62 × H 78 cm (framed)",
    era: "Late 19th / early 20th century",
    collection: "collectors-edit",
    listedAt: "2026-06-15",
  },
];

export const justListed = catalog.filter((p) => p.collection === "just-listed");
export const editorsPicks = catalog.filter((p) => p.collection === "editors-picks");
export const moreToDiscover = catalog.filter(
  (p) =>
    p.id === "victorian-chaise-longue" ||
    p.id === "murano-glass-pendant-chandelier" ||
    p.id === "regency-rosewood-console-table" ||
    p.id === "antique-portrait-in-gilded-frame",
);
export const collectorsEditProducts = catalog.filter(
  (p) => p.collection === "collectors-edit",
);

export const categories: Category[] = [
  {
    name: "Chairs",
    slug: "chairs",
    image: "/images/chairs.png",
    href: "/category/chairs",
    description: "Bergères, peacock chairs, and seating with silhouette.",
  },
  {
    name: "Sofas",
    slug: "sofas",
    image: "/images/sofas.png",
    href: "/category/sofas",
    description: "Chaises and soft seating for rooms that linger.",
  },
  {
    name: "Tables",
    slug: "tables",
    image: "/images/tables.png",
    href: "/category/tables",
    description: "Consoles, credenzas, and surfaces with provenance.",
  },
  {
    name: "Lighting",
    slug: "lighting",
    image: "/images/lighting.png",
    href: "/category/lighting",
    description: "Floor lamps, pendants, and chandeliers.",
  },
  {
    name: "Rugs",
    slug: "rugs",
    image: "/images/rugs.png",
    href: "/category/rugs",
    description: "Kilims and textiles that ground a room.",
  },
  {
    name: "Mirrors",
    slug: "mirrors",
    image: "/images/french-empire-gilt-mirror.png",
    href: "/category/mirrors",
    description: "Gilt and period mirrors.",
  },
  {
    name: "Art",
    slug: "art",
    image: "/images/art.png",
    href: "/category/art",
    description: "Paintings and portraits for considered walls.",
  },
];

export const rooms: Room[] = [
  {
    name: "Living Room",
    slug: "living-room",
    image: "/images/living-room.png",
    href: "/room/living-room",
    description: "Seating, lighting, and art for the heart of the home.",
  },
  {
    name: "Bedroom",
    slug: "bedroom",
    image: "/images/bedroom.png",
    href: "/room/bedroom",
    description: "Quiet pieces for restful, layered private spaces.",
  },
  {
    name: "Dining Room",
    slug: "dining-room",
    image: "/images/dining-room.png",
    href: "/room/dining-room",
    description: "Tables, sideboards, and light above the gathering.",
  },
];

export const valueProps: ValueProp[] = [
  {
    symbol: "✦",
    title: "Curated Listings",
    body: "Every piece is reviewed before going live. Quality over quantity, always.",
  },
  {
    symbol: "◈",
    title: "Direct from Sellers",
    body: "No middlemen. Buy straight from the source at honest, agreed prices.",
  },
  {
    symbol: "⊕",
    title: "Simple Payments",
    body: "Pay via InstaPay or Bank Transfer — directly to the seller, no third party.",
  },
  {
    symbol: "◎",
    title: "Confirmed Handover",
    body: "Our two-sided confirmation system ensures every transaction closes cleanly.",
  },
];

export const articles: Article[] = [
  {
    slug: "the-art-of-the-considered-interior",
    tag: "Living",
    title: "The Art of the Considered Interior",
    excerpt:
      "Why the best-dressed rooms tell a story — and how second-hand pieces become its protagonists.",
    image: "/images/the-art-of-the-considered-interior.png",
    href: "/journal/the-art-of-the-considered-interior",
    date: "12 June 2026",
    body: [
      "A considered interior is not a mood board realised overnight. It is a room that has been allowed to gather — objects with history, surfaces with patience, and a quiet confidence that does not need to shout.",
      "Second-hand pieces excel here because they arrive with a past. A bergère that once sat in a Zamalek apartment, a kilim worn soft by decades of footsteps — these are not anonymous products. They are characters.",
      "At Going Twice, we believe the most interesting homes in Cairo are not the newest ones. They are the ones that mix eras with intention: a mid-century credenza under a gilt mirror, a Deco lamp beside a contemporary sofa.",
      "Start with one piece that holds your attention. Build around it. Let the room tell you what it needs next.",
    ],
  },
  {
    slug: "five-pieces-worth-inheriting-this-season",
    tag: "Guide",
    title: "Five Pieces Worth Inheriting This Season",
    excerpt:
      "From teak credenzas to gilt mirrors — the vintage silhouettes worth making room for.",
    image: "/images/five-pieces-worth-inheriting-this-season.png",
    href: "/journal/five-pieces-worth-inheriting-this-season",
    date: "28 May 2026",
    body: [
      "Not every vintage find deserves a permanent place. Some are beautiful but temporary. Others become part of the architecture of how you live.",
      "This season we keep returning to five silhouettes: the teak credenza, the gilt mirror, the crystal chandelier, the bergère armchair, and the flatwoven kilim. Each earns its keep — storage, light, seating, texture.",
      "When you inherit (or acquire) a piece like this, treat it as infrastructure. Place it where it works hardest. Let cheaper, quieter objects orbit around it.",
      "Browse Editor’s Picks and The Collector’s Edit for current examples of these forms on Going Twice.",
    ],
  },
  {
    slug: "how-to-style-a-vintage-piece-in-a-modern-room",
    tag: "Style",
    title: "How to Style a Vintage Piece in a Modern Room",
    excerpt:
      "The tension between old and new is where the most interesting interiors are born.",
    image: "/images/how-to-style-a-vintage-piece-in-a-modern-room.png",
    href: "/journal/how-to-style-a-vintage-piece-in-a-modern-room",
    date: "8 May 2026",
    body: [
      "A modern room with one exceptional vintage piece rarely feels mismatched. It feels edited. The trick is contrast with restraint: one ornate frame against a clean wall, one carved chair against a low sofa.",
      "Avoid scattering too many competing eras. Choose a primary language for the room — pale walls, simple textiles — then introduce a single older voice.",
      "Lighting helps bridge decades. A brass floor lamp softens contemporary furniture; a Murano pendant makes a plain dining table feel intentional.",
      "When in doubt, leave space. Vintage pieces need air around them to read as deliberate, not accidental.",
    ],
  },
];

export const footerColumns: { title: string; links: FooterLink[] }[] = [
  {
    title: "Shop",
    links: [
      { label: "Shop All", href: "/shop" },
      { label: "Furniture", href: "/furniture" },
      { label: "Decoration", href: "/decoration" },
      { label: "Lighting", href: "/lighting" },
      { label: "Art", href: "/art" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "About Going Twice", href: "/about" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Contact Us", href: "/contact" },
    ],
  },
  {
    title: "Help & Legal",
    links: [
      { label: "Help Centre", href: "/help" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
    ],
  },
];

export const helpFaqs = [
  {
    q: "How do I buy a piece?",
    a: "Browse the shop, open a listing, and use the contact seller flow. You’ll agree on price and handover directly with the seller. Payments are via InstaPay or bank transfer — never through a third-party checkout on Going Twice.",
  },
  {
    q: "How do I sell?",
    a: "Use Sell a Piece to submit details and photos. Our team reviews every listing before it goes live. Once approved, buyers can find your piece on the marketplace.",
  },
  {
    q: "Are pieces authenticated?",
    a: "We curate for quality and honesty. Sellers describe condition and provenance; we review listings before publication. Always review photos and ask the seller questions before confirming.",
  },
  {
    q: "What is confirmed handover?",
    a: "Both buyer and seller confirm when the piece has changed hands. This closes the transaction cleanly and keeps both sides accountable.",
  },
  {
    q: "Where does Going Twice operate?",
    a: "We focus on Cairo and private homes across Egypt. Handover logistics are arranged between buyer and seller.",
  },
];

export const howItWorksBuyer = [
  {
    step: "01",
    title: "Browse the Collection",
    body: "Explore curated vintage pieces across Furniture, Decoration, Lighting, and Art. Filter by category, condition, material, and price.",
  },
  {
    step: "02",
    title: "Find Your Piece",
    body: "Each listing shows high-quality photography, full dimensions, condition notes, and the seller's general location.",
  },
  {
    step: "03",
    title: "Contact the Seller",
    body: "Once you've decided, log in to see the seller's contact details. Arrange a viewing or discuss the piece directly.",
  },
  {
    step: "04",
    title: "Collect & Enjoy",
    body: "Agree on a collection time, pay the seller directly using one of their accepted payment methods, and bring your new piece home.",
  },
];

export const howItWorksSeller = [
  {
    step: "01",
    title: "List Your Piece",
    body: "Share photos, measurements, condition notes, and your asking price. Listings take just a few minutes to submit.",
  },
  {
    step: "02",
    title: "We Review It",
    body: "Our team checks quality and clarity before your listing appears on Going Twice — keeping the shop considered.",
  },
  {
    step: "03",
    title: "Connect with Buyers",
    body: "Interested buyers reach out directly. You set the terms and arrange a viewing or handover on your schedule.",
  },
  {
    step: "04",
    title: "Get Paid & Hand Over",
    body: "Receive payment via InstaPay or bank transfer, then confirm collection together so the sale closes cleanly.",
  },
];

/* ---- Catalog helpers ---- */

export type CatalogSort = "newest" | "price-asc" | "price-desc" | "name";

export function getProductById(id: string): Product | undefined {
  return catalog.find((p) => p.id === id);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getRoomBySlug(slug: string): Room | undefined {
  return rooms.find((r) => r.slug === slug);
}

export function getDepartment(slug: string): Department | undefined {
  return departments.find((d) => d.slug === slug);
}

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  return catalog
    .filter(
      (p) =>
        p.id !== product.id &&
        (p.category === product.category || p.department === product.department),
    )
    .slice(0, limit);
}

export function filterCatalog(options: {
  department?: DepartmentSlug;
  category?: CategorySlug;
  room?: RoomSlug;
  collection?: string;
  sort?: CatalogSort | string;
  q?: string;
}): Product[] {
  let items = [...catalog];

  if (options.department) {
    items = items.filter((p) => p.department === options.department);
  }
  if (options.category) {
    items = items.filter((p) => p.category === options.category);
  }
  if (options.room) {
    items = items.filter((p) => p.room === options.room);
  }
  if (options.q?.trim()) {
    const needle = options.q.trim().toLowerCase();
    items = items.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.seller.toLowerCase().includes(needle) ||
        p.description.toLowerCase().includes(needle) ||
        p.category.toLowerCase().includes(needle),
    );
  }

  if (options.collection === "editors-picks") {
    items = items.filter((p) => p.collection === "editors-picks");
  } else if (options.collection === "collectors-edit") {
    items = items.filter((p) => p.collection === "collectors-edit");
  } else if (options.collection === "just-listed" || options.sort === "newest") {
    // newest sort handled below; collection just-listed filters explicitly
    if (options.collection === "just-listed") {
      items = items.filter((p) => p.collection === "just-listed");
    }
  }

  const sort = (options.sort as CatalogSort) || "newest";
  items.sort((a, b) => {
    switch (sort) {
      case "price-asc":
        return a.priceValue - b.priceValue;
      case "price-desc":
        return b.priceValue - a.priceValue;
      case "name":
        return a.name.localeCompare(b.name);
      case "newest":
      default:
        return b.listedAt.localeCompare(a.listedAt);
    }
  });

  return items;
}
