// Az ajánlat PDF-ben (a levél melléklete). Ugyanabból a nézetmodellből készül, mint a levél.
// Betűtípus: DM Sans beágyazva – az alap (latin) és a kiegészítő (latin-ext: ő, ű) fájl
// tartalékláncban, így minden magyar ékezet helyesen jelenik meg.

import path from "node:path";
import { Document, Font, Link, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { OfferView } from "./view";

const FONT_DIR = path.join(process.cwd(), "src", "modules", "offers", "fonts");
let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  Font.register({
    family: "DMSans",
    fonts: [
      { src: path.join(FONT_DIR, "dm-sans-latin-400-normal.woff") },
      { src: path.join(FONT_DIR, "dm-sans-latin-700-normal.woff"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: "DMSansExt",
    fonts: [
      { src: path.join(FONT_DIR, "dm-sans-latin-ext-400-normal.woff") },
      { src: path.join(FONT_DIR, "dm-sans-latin-ext-700-normal.woff"), fontWeight: 700 },
    ],
  });
  // Ne tördelje kötőjellel a szavakat.
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

const TEXT = "#1C1C1A";
const MUTED = "#6B6560";
const LINE = "#E2DDD7";
const SOFT = "#F0EDE8";

const st = StyleSheet.create({
  page: { fontFamily: ["DMSans", "DMSansExt"] as unknown as string, fontSize: 10, color: TEXT, paddingBottom: 60 },
  header: { paddingHorizontal: 36, paddingVertical: 22, color: "#FFFFFF", flexDirection: "row", justifyContent: "space-between" },
  small: { fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", color: "rgba(255,255,255,0.75)" },
  title: { fontSize: 20, fontWeight: 700, marginTop: 4 },
  body: { paddingHorizontal: 36, paddingTop: 16 },
  p: { fontSize: 10, lineHeight: 1.5, marginBottom: 8 },
  box: { backgroundColor: SOFT, borderRadius: 6, padding: 10, marginVertical: 6 },
  row: { flexDirection: "row", paddingVertical: 3 },
  k: { width: "30%", color: MUTED },
  v: { width: "70%", fontWeight: 700 },
  th: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 5, marginTop: 10 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 5 },
  c1: { width: "46%", paddingRight: 6 },
  c2: { width: "20%", color: MUTED },
  c3: { width: "16%", textAlign: "right", color: MUTED },
  c4: { width: "18%", textAlign: "right" },
  thText: { fontSize: 7.5, color: MUTED, textTransform: "uppercase", letterSpacing: 0.8 },
  total: { flexDirection: "row", justifyContent: "space-between", paddingTop: 8, fontSize: 13, fontWeight: 700 },
  deposit: { backgroundColor: "#EEF3EE", borderWidth: 1, borderColor: "#C5D5C5", borderRadius: 6, padding: 12, marginTop: 12 },
  footer: { position: "absolute", bottom: 22, left: 36, right: 36, fontSize: 8, color: MUTED, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 6 },
});

function OfferPdf({ view }: { view: OfferView }) {
  const { brand } = view;
  return (
    <Document title={`Árajánlat ${view.number}, ${brand.propertyName}`} author={brand.propertyName} language="hu">
      <Page size="A4" style={st.page}>
        <View style={[st.header, { backgroundColor: brand.brandColor }]}>
          <View>
            <Text style={st.small}>{brand.propertyName}</Text>
            <Text style={st.title}>Árajánlat</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={st.small}>Ajánlatszám</Text>
            <Text style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{view.number}</Text>
          </View>
        </View>

        <View style={st.body}>
          <Text style={{ fontSize: 9, color: MUTED, marginBottom: 10 }}>{view.title}</Text>
          <Text style={st.p}>{view.greeting}</Text>
          <Text style={st.p}>{view.intro}</Text>
          {view.personalMessage ? <Text style={st.p}>{view.personalMessage}</Text> : null}

          <View style={st.box}>
            {view.summary.map(([k, v]) => (
              <View key={k} style={st.row}>
                <Text style={st.k}>{k}</Text>
                <Text style={st.v}>{v}</Text>
              </View>
            ))}
          </View>

          <View style={st.th}>
            <Text style={[st.c1, st.thText]}>Megnevezés</Text>
            <Text style={[st.c2, st.thText]}>Mennyiség</Text>
            <Text style={[st.c3, st.thText]}>Egységár</Text>
            <Text style={[st.c4, st.thText]}>Összeg</Text>
          </View>
          {view.lines.map((l, i) => (
            <View key={`${l.label}-${i}`} style={st.tr} wrap={false}>
              <Text style={st.c1}>{l.label}</Text>
              <Text style={st.c2}>{l.qty}</Text>
              <Text style={st.c3}>{l.unitPrice}</Text>
              <Text style={[st.c4, l.negative ? { color: "#3A5A3C" } : {}]}>{l.amount}</Text>
            </View>
          ))}
          <View style={st.total}>
            <Text>ÖSSZESEN</Text>
            <Text>{view.total}</Text>
          </View>

          {view.deposit ? (
            <View style={st.deposit} wrap={false}>
              <Text style={{ fontSize: 8, fontWeight: 700, color: brand.accentColor, textTransform: "uppercase", letterSpacing: 0.8 }}>
                Foglaló ({view.deposit.percent}%)
              </Text>
              <Text style={{ fontSize: 16, fontWeight: 700, marginVertical: 3 }}>{view.deposit.amount}</Text>
              <Text style={st.p}>{view.deposit.due}</Text>
              <Text style={{ fontSize: 8.5, color: MUTED, lineHeight: 1.4 }}>
                {view.deposit.terms} Részletek: <Link src={view.aszfUrl} style={{ color: brand.accentColor }}>{view.aszfUrl.replace(/^https?:\/\//, "")}</Link>
              </Text>
            </View>
          ) : null}

          <View style={{ marginTop: 14 }} wrap={false}>
            <Text style={st.p}>
              Elfogadás: <Link src={view.acceptUrl} style={{ color: brand.accentColor }}>kattintson ide</Link>, vagy válaszoljon a levelünkre.
            </Text>
            <Text style={[st.p, { color: MUTED }]}>{view.validity}</Text>
            <Text style={st.p}>Kérdése van? Hívjon minket: {brand.phone}</Text>
          </View>

          {view.info.length ? (
            <View style={{ marginTop: 6, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 }} wrap={false}>
              <Text style={{ fontSize: 8.5, color: MUTED, marginBottom: 3 }}>Tájékoztatás (nem része a végösszegnek):</Text>
              {view.info.map((b) => (
                <Text key={b.title} style={{ fontSize: 8.5, color: MUTED, lineHeight: 1.4 }}>
                  <Text style={{ fontWeight: 700, color: TEXT }}>{b.title}: </Text>
                  {b.items.join(" · ")}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <View style={st.footer} fixed>
          <Text>
            {brand.propertyName} · {brand.address} · {brand.phone} · {brand.email} · {brand.websiteUrl.replace(/^https?:\/\//, "")}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function renderOfferPdf(view: OfferView): Promise<Buffer> {
  registerFonts();
  return renderToBuffer(<OfferPdf view={view} />);
}

// "Ajanlat-2027-001-Viki-Vendeghaz.pdf" – ékezet és szóköz nélkül
export function offerPdfFilename(number: string, propertyName: string): string {
  const slug = propertyName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `Ajanlat-${number}-${slug}.pdf`;
}
