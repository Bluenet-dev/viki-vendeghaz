// Strukturált adat (JSON-LD) – tiszta függvények, DB-hozzáférés nélkül. Az oldalak
// ugyanazokat az adatokat adják be, amiket megjelenítenek (settings, faq tábla), így
// a séma nem külön karbantartott szöveg.

export const SITE_URL = "https://www.vikivendeghaz.hu";

// A közösségi profilok – a lábléc is innen linkel.
export const SOCIAL = {
  facebook: "https://facebook.com/vikivendeghaz",
  instagram: "https://instagram.com/vikivendeghaz",
  tiktok: "https://tiktok.com/@vikivendeghaz",
} as const;

// A térkép-beágyazás (/kapcsolat) koordinátája: Szilvásvárad, Dózsa György u. 45.
const GEO = { latitude: 48.098773, longitude: 20.386681 };

const NTAK = "MA22031772";

// Ami valóban van (wellness-oldalak, /vendeghaz/medence, GYIK).
const AMENITIES = [
  "Sóbarlang",
  "Finn szauna",
  "Infraszauna",
  "Dézsafürdő",
  "Kültéri medence",
  "Jakuzzi",
  "Ingyenes WiFi",
  "Ingyenes parkolás",
];

// JSON-LD biztonságosan a nyers HTML-be (a "<" ne zárhasson le script taget).
export const ldJson = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

export interface FaqRow {
  question: string;
  answer: string;
}

// A /gyik oldal látható kérdései és válaszai, ugyanabban a sorrendben.
export function faqPageJsonLd(items: FaqRow[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

// "3348 Szilvásvárad, Dózsa György utca 45." → PostalAddress
export function postalAddress(address: string) {
  const m = address.trim().match(/^(\d{4})\s+([^,]+),\s*(.+)$/);
  if (!m) return { "@type": "PostalAddress", streetAddress: address, addressCountry: "HU" };
  return { "@type": "PostalAddress", streetAddress: m[3], addressLocality: m[2], postalCode: m[1], addressCountry: "HU" };
}

export interface LodgingInput {
  propertyName: string;
  phone: string;
  email: string;
  address: string;
  checkInFrom: string;
  checkOutUntil: string;
  numberOfRooms: number;
  description: string;
  image: string; // útvonal vagy abszolút URL
}

export function lodgingBusinessJsonLd(s: LodgingInput) {
  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "@id": `${SITE_URL}/#lodging`,
    name: s.propertyName,
    url: `${SITE_URL}/`,
    telephone: s.phone.replace(/[^\d+]/g, ""),
    email: s.email,
    image: new URL(s.image, SITE_URL).toString(),
    description: s.description,
    address: postalAddress(s.address),
    geo: { "@type": "GeoCoordinates", ...GEO },
    checkinTime: s.checkInFrom,
    checkoutTime: s.checkOutUntil,
    numberOfRooms: s.numberOfRooms,
    amenityFeature: AMENITIES.map((name) => ({ "@type": "LocationFeatureSpecification", name, value: true })),
    petsAllowed: false, // GYIK: „Vendégházunk kutyát, macskát és egyéb kisállatot nem fogad.”
    sameAs: [SOCIAL.facebook, SOCIAL.instagram, SOCIAL.tiktok],
    identifier: { "@type": "PropertyValue", propertyID: "NTAK", value: NTAK },
  };
}
