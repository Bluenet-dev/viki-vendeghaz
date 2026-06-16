import { Pool } from "@neondatabase/serverless";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const blogPosts = [
  {
    slug: "szalajka-volgy-turak-utmutato",
    title: "A Szalajka-völgy legjobb túraútvonalai – teljes útmutató",
    excerpt:
      "A Szalajka-völgy a Bükki Nemzeti Park egyik legszebb szeglete. Összegyűjtöttük a legjobb túraútvonalakat kezdőknek és tapasztalt túrázóknak egyaránt.",
    content: `A Szalajka-völgy Szilvásvárad szívéből indul, és a Bükki Nemzeti Park egyik legkedveltebb természeti látványossága. A völgy mentén kristálytiszta patakok, vízesések és ősi bükkösök várják a látogatókat.

## Ajánlott útvonalak

### 1. Szalajka-völgy – Fátyol-vízesés (könnyű, 4 km)
Az egyik legnépszerűbb séta, amelyet akár gyerekekkel is kényelmesen teljesíteni lehet. A Fátyol-vízesés lenyűgöző látványt nyújt, különösen tavasszal és esős időszak után.

Időigény: 1,5–2 óra oda-vissza | Nehézség: Könnyű

### 2. Istállós-kői barlang (közepes, 8 km)
Az Istállós-kői barlang az egyik legjelentősebb őskori lelőhelyszín Magyarországon. Az útvonal a Szalajka-völgytől indul, és a Bükk-fennsík peremére vezet fel.

Időigény: 3–4 óra | Nehézség: Közepes | Magasságkülönbség: ~350 m

### 3. Bálvány-csúcs kör (haladó, 14 km)
A legtapasztaltabb túrázóknak ajánlott kör, amely érinti a Bálvány-csúcsot és a Bükk-fennsík néhány legszebb pontját.

Időigény: 5–6 óra | Nehézség: Haladó

## Praktikus tippek

- Legjobb időszak: április–október, de a téli hóban is csodás
- Megfelelő túracipő mindenképp szükséges
- A szalajkai sziklaforrásnál mindig van friss ivóvíz
- Gyerekvasút a Szalajka-völgyben március–október között közlekedik

A Viki Vendégházból a völgy bejárata mindössze néhány perces sétára van – így reggeli után azonnal indulhat a kaland!`,
    category: "turak",
    published: true,
    publishedAt: new Date("2025-03-15"),
  },
  {
    slug: "sobarlang-hatasai-miert-erdemes",
    title: "Sóbarlang terápia – miért érdemes kipróbálni?",
    excerpt:
      "A só-aeroszol kezelés légúti panaszokra, bőrproblémákra és stresszre egyaránt hatékony. Összefoglaljuk a sóbarlang terápia legfontosabb előnyeit.",
    content: `A sóterápia már évezredek óta ismert gyógyító módszer. A lengyel és osztrák sóbányászok megfigyelték, hogy a föld alatt dolgozó munkások ritkán szenvedtek légúti betegségekben – ez adta az ötletet a sóbarlang-terápiához.

## Mire jó a sóbarlang?

### Légúti problémák
A só-aeroszol részecskék mélyen behatolnak a légutakba, ahol feloldják a nyálkát, csökkentik a gyulladást és erősítik a csillószőrök mozgását. Különösen hatékony asztma, allergia, krónikus hörghurut és sinusitis esetén.

### Bőrproblémák
A sós levegő antibakteriális hatása segíthet ekcéma, pikkelysömör és akné tüneteinek enyhítésében, valamint a bőr hidratálásában.

### Stressz és relaxáció
A csöndes, egyenletes hőmérsékletű sóbarlang kiváló helyszín a mindennapi rohanásból való kiszakadásra. A só negatív ionjai javíthatják a hangulatot és csökkenthetik a szorongást.

## A Viki Vendégház sóbarlangja

Sóbarlangunk szállóvendégeinknek napi 45 perc ingyenes kezelési időt biztosít. A külső vendégek számára is nyitva áll – nézze meg az árainkat a Sóbarlang oldalon!

Javasolt kezelési hossz: legalább 45 perc/alkalom, sorozat esetén 10–15 alkalom.`,
    category: "wellness",
    published: true,
    publishedAt: new Date("2025-04-02"),
  },
  {
    slug: "szilvasvarad-programok-latnivalok",
    title: "Mit látni Szilvásváradon? – A 10 legjobb program és látnivaló",
    excerpt:
      "Szilvásvárad sokkal több, mint a Szalajka-völgy és a lipicai lovak. Összegyűjtöttük a legjobb programokat, amelyeket egyetlen hétvégén sem szabad kihagyni.",
    content: `Szilvásvárad a Bükki Nemzeti Park kapujában fekvő kis település, amelyet évente több százezer turista keres fel. De vajon mi mindent érdemes megnézni?

## Top 10 program Szilvásváradon

1. Szalajka-völgy és a Fátyol-vízesés – gyalog vagy kisvasúttal egyaránt bejárható
2. Lipicai Ménes Látogatóközpont – lovasbemutató minden évszakban, szeptemberben Lipicai Fesztivál
3. Orbán-ház és Helytörténeti Gyűjtemény – a település múltját bemutató kiállítás
4. Szalajkai Erdei Vasút – nostalgikus kisvasút Szalajkafüredig, gyerekek nagy kedvence
5. Istállós-kői barlang – Közép-Európa egyik legjelentősebb ősemberi lelőhelye
6. Bükki Nemzeti Park tanösvényei – tucatnyi jelzett ösvény természetismereti sétára
7. Szilvásvárad Arborétum – ritka fafajok gyűjteménye szép sétaútvonalakkal
8. Pisztrángtenyésztő és horgásztó – az egyik legrégebbi pisztrángtenyészet az országban
9. Kerékpározás a völgyben – kerékpárkölcsönző a bejáratnál
10. Wellness a Viki Vendégházban – sóbarlang, finn szauna és dézsafürdő egy aktív túranap után

## Mikor menjünk?

Tavasz (április–május): zöldülő erdők, vízesés teli vízzel, tavaszi vadvirágok.
Nyár (június–augusztus): főszezon, élénk programkínálat, lovasbemutató.
Ősz (szeptember–október): az erdő szebbnél szebb őszi színekben, kevesebb tömeg.
Tél (december–február): havas táj, csendes pihenés, wellness-szezon.

A Viki Vendégház egész évben nyitva tart – jöjjön bármikor!`,
    category: "szilvasvarad",
    published: true,
    publishedAt: new Date("2025-04-20"),
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query("SELECT COUNT(*) FROM posts");
    if (Number(rows[0].count) > 0) {
      console.log("Posts already seeded, skipping.");
      return;
    }
    for (const p of blogPosts) {
      await client.query(
        "INSERT INTO posts (slug, title, excerpt, content, category, published, published_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [p.slug, p.title, p.excerpt, p.content, p.category, p.published, p.publishedAt]
      );
      console.log("Inserted:", p.slug);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((e) => { console.error(e.message); process.exit(1); });
