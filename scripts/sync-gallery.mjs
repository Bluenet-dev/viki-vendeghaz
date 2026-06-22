// Galéria szinkron: a public/galeria/<kategória>/ mappák képeiből adatbázis-sorokat
// készít (gallery tábla), hogy a képek megjelenjenek az adminban és a publikus oldalon
// is – Blob feltöltés nélkül.
//
// Használat:  pnpm gallery:sync
//   (a .env.local DATABASE_URL-jét használja, ugyanazt a Neon adatbázist, mint az éles)
//
// Mappaszerkezet:   public/galeria/<kategória>/01.jpg, 02.jpg, ...
//   - a fájlnevek ábécé/szám szerint rendeződnek → ez adja a sorrendet (sort_order)
//   - a kategórián belüli ELSŐ fájl lesz a borítókép
//
// A script idempotens: csak a "/galeria/..." kezdetű (statikus) sorokat kezeli, a
// Blobra feltöltött (http...) képeket és a kézzel szerkesztett alt-szövegeket nem bántja.

import { neon } from "@neondatabase/serverless";
import { readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const VALID_CATEGORIES = [
  "szoba-1",
  "szoba-2",
  "superior",
  "egesz-haz",
  "sobarlang",
  "finn-szauna",
  "infraszauna",
  "dezsafurdo",
  "kert-medence",
  "udvar",
  "termeszet",
  "etkezes",
  "wellness",
];

const IMG_RE = /\.(jpe?g|png|webp|avif|gif)$/i;
const ROOT = join(process.cwd(), "public", "galeria");

if (!process.env.DATABASE_URL) {
  console.error("Hiányzik a DATABASE_URL (futtasd: pnpm gallery:sync).");
  process.exit(1);
}
if (!existsSync(ROOT)) {
  console.error(`Nincs ilyen mappa: ${ROOT}\nHozd létre és másold bele a képeket kategóriánként.`);
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// 1. Fájlok összegyűjtése a mappákból
const found = [];
for (const category of readdirSync(ROOT)) {
  const dir = join(ROOT, category);
  if (!statSync(dir).isDirectory()) continue;
  if (!VALID_CATEGORIES.includes(category)) {
    console.warn(`⚠  Ismeretlen kategória-mappa kihagyva: "${category}"`);
    continue;
  }
  const files = readdirSync(dir)
    .filter((f) => IMG_RE.test(f))
    .sort((a, b) => a.localeCompare(b, "hu", { numeric: true }));
  files.forEach((f, i) => {
    found.push({ url: `/galeria/${category}/${f}`, category, order: i + 1 });
  });
}

// 2. Meglévő statikus sorok
const existing = await sql`SELECT id, url FROM gallery WHERE url LIKE '/galeria/%'`;
const existingByUrl = new Map(existing.map((r) => [r.url, r]));
const foundUrls = new Set(found.map((f) => f.url));

// 3. Upsert (alt-szöveget megőrizve)
let inserted = 0;
let updated = 0;
for (const f of found) {
  if (existingByUrl.has(f.url)) {
    await sql`UPDATE gallery SET sort_order = ${f.order}, category = ${f.category} WHERE url = ${f.url}`;
    updated++;
  } else {
    await sql`INSERT INTO gallery (url, alt, category, sort_order) VALUES (${f.url}, '', ${f.category}, ${f.order})`;
    inserted++;
  }
}

// 4. Törlés: ami már nincs meg a mappában
let deleted = 0;
for (const r of existing) {
  if (!foundUrls.has(r.url)) {
    await sql`DELETE FROM gallery WHERE id = ${r.id}`;
    deleted++;
  }
}

console.log(
  `✓ Galéria szinkron kész. Talált fájl: ${found.length} | beszúrva: ${inserted}, frissítve: ${updated}, törölve: ${deleted}`,
);
if (found.length === 0) {
  console.log("Tipp: a képeket a public/galeria/<kategória>/ mappákba másold (pl. public/galeria/sobarlang/01.jpg).");
}
