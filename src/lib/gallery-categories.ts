// Galéria-kategóriák egységes forrása (admin feltöltő + publikus /galeria + /szobak).
// A sorrend itt határozza meg az admin szekciók és a publikus galéria sorrendjét.
export const GALLERY_CATEGORIES = [
  { value: "szoba-1", label: "Komfort Kétágyas Szoba" },
  { value: "szoba-2", label: "Komfort Franciaágyas Szoba" },
  { value: "superior", label: "Superior Szoba" },
  { value: "egesz-haz", label: "Egész ház / közös területek" },
  { value: "sobarlang", label: "Sóbarlang" },
  { value: "finn-szauna", label: "Finn szauna" },
  { value: "infraszauna", label: "Infraszauna" },
  { value: "dezsafurdo", label: "Dézsafürdő" },
  { value: "kert-medence", label: "Kert & medence" },
  { value: "udvar", label: "Udvar & kert" },
  { value: "termeszet", label: "Természet" },
  { value: "etkezes", label: "Étkezés (saját konyha, grill, sütés-főzés)" },
  { value: "gasthaus", label: "Partnerétterem (félpanzió)" },
  { value: "wellness", label: "Wellness (általános)" },
] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number]["value"];

export const GALLERY_CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  GALLERY_CATEGORIES.map((c) => [c.value, c.label]),
);

// Azok a kategóriák, amelyek egy-egy publikus wellness aloldal hero-képét adják.
export const WELLNESS_CATEGORIES = [
  "sobarlang",
  "finn-szauna",
  "infraszauna",
  "dezsafurdo",
  "kert-medence",
];

// A szoba-kategóriák, amelyek a /szobak oldal kártyáihoz / lightboxához tartoznak.
export const ROOM_CATEGORIES = ["szoba-1", "szoba-2", "superior"];
