// Az ajánlat HTML levele: táblázatos elrendezés, inline stílusok (Gmail, Outlook, mobil).
// A <OfferBody> ugyanígy jelenik meg a /ajanlat/[token] oldalon és az admin előnézetben.
// A szöveg minden része a nézetmodellből (view.ts) jön.

import type { ReactNode } from "react";
import type { Brand, OfferView } from "./view";

const FONT = "Arial, Helvetica, sans-serif";
const TEXT = "#1C1C1A";
const MUTED = "#6B6560";
const LINE = "#E2DDD7";
const SOFT = "#F0EDE8";

function Footer({ brand }: { brand: Brand }) {
  return (
    <tr>
      <td style={{ padding: "18px 28px", background: SOFT, fontSize: 12, lineHeight: "18px", color: MUTED, fontFamily: FONT }}>
        <strong style={{ color: TEXT }}>{brand.propertyName}</strong> · {brand.address}
        <br />
        {brand.phone} · <a href={`mailto:${brand.email}`} style={{ color: MUTED }}>{brand.email}</a> ·{" "}
        <a href={brand.websiteUrl} style={{ color: MUTED }}>{brand.websiteUrl.replace(/^https?:\/\//, "")}</a>
        <br />
        <a href={brand.aszfUrl} style={{ color: MUTED }}>Általános Szerződési Feltételek</a>
      </td>
    </tr>
  );
}

function Header({ brand, title, number }: { brand: Brand; title: string; number?: string }) {
  return (
    <tr>
      <td style={{ background: brand.brandColor, padding: "22px 28px", color: "#FFFFFF", fontFamily: FONT }}>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: "middle" }}>
                {brand.logoUrl ? (
                  <img src={brand.logoUrl} alt={brand.propertyName} height={36} style={{ display: "block", height: 36, border: 0, marginBottom: 8 }} />
                ) : null}
                <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.72)" }}>{brand.propertyName}</div>
                <div style={{ fontSize: 22, fontWeight: "bold", marginTop: 4, lineHeight: "28px" }}>{title}</div>
              </td>
              {number ? (
                <td style={{ verticalAlign: "top", textAlign: "right", fontSize: 12, color: "rgba(255,255,255,0.72)", whiteSpace: "nowrap" }}>
                  Ajánlatszám
                  <div style={{ fontSize: 16, fontWeight: "bold", color: "#FFFFFF" }}>{number}</div>
                </td>
              ) : null}
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}

function Button({ href, color, children }: { href: string; color: string; children: ReactNode }) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} style={{ margin: "8px 0" }}>
      <tbody>
        <tr>
          <td style={{ background: color, borderRadius: 8 }}>
            <a
              href={href}
              style={{ display: "inline-block", padding: "14px 26px", color: "#FFFFFF", fontFamily: FONT, fontSize: 16, fontWeight: "bold", textDecoration: "none" }}
            >
              {children}
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function Paragraph({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return <p style={{ margin: "0 0 12px", fontSize: 15, lineHeight: "23px", color: muted ? MUTED : TEXT, fontFamily: FONT }}>{children}</p>;
}

// A levél törzse (fejléctől a láblécig). `acceptSlot`: a webes oldalon a link helyett gomb.
export function OfferBody({ view, acceptSlot }: { view: OfferView; acceptSlot?: ReactNode }) {
  const { brand } = view;
  const cell = { padding: "8px 0", borderBottom: `1px solid ${LINE}`, fontSize: 14, fontFamily: FONT, verticalAlign: "top" as const };

  return (
    <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ background: "#F7F5F1", padding: "24px 0" }}>
      <tbody>
        <tr>
          <td align="center">
            <table
              role="presentation"
              width={600}
              cellPadding={0}
              cellSpacing={0}
              style={{ maxWidth: 600, width: "100%", background: "#FFFFFF", borderRadius: 10, overflow: "hidden", textAlign: "left" }}
            >
              <tbody>
                <Header brand={brand} title={view.kind === "betelt" ? view.title : "Árajánlat"} number={view.number} />
                {view.kind === "ajanlat" ? (
                  <tr>
                    <td style={{ padding: "6px 28px 0", fontSize: 13, color: MUTED, fontFamily: FONT }}>{view.title}</td>
                  </tr>
                ) : null}
                <tr>
                  <td style={{ padding: "18px 28px 8px" }}>
                    <Paragraph>{view.greeting}</Paragraph>
                    <Paragraph>{view.intro}</Paragraph>
                    {view.personalMessage ? (
                      <p style={{ margin: "0 0 14px", fontSize: 15, lineHeight: "23px", color: TEXT, fontFamily: FONT, whiteSpace: "pre-line" }}>{view.personalMessage}</p>
                    ) : null}
                  </td>
                </tr>

                {view.kind === "betelt" ? (
                  <tr>
                    <td style={{ padding: "0 28px 16px" }}>
                      {view.alternatives.length === 0 ? (
                        <Paragraph>A következő hónapokban sajnos nem találtunk hasonló szabad időszakot. Hívjon minket, és együtt keresünk megoldást: {brand.phone}</Paragraph>
                      ) : (
                        view.alternatives.map((a) => (
                          <table key={a.range} role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ background: SOFT, borderRadius: 8, margin: "0 0 12px" }}>
                            <tbody>
                              <tr>
                                <td style={{ padding: "14px 16px", fontFamily: FONT }}>
                                  <div style={{ fontSize: 16, fontWeight: "bold", color: TEXT }}>{a.range}</div>
                                  <div style={{ fontSize: 13, color: MUTED, margin: "2px 0 8px" }}>{a.nights}</div>
                                  <Button href={a.url} color={brand.accentColor}>Ajánlatot kérek erre az időpontra</Button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        ))
                      )}
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* Összefoglaló */}
                    <tr>
                      <td style={{ padding: "0 28px 8px" }}>
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ background: SOFT, borderRadius: 8 }}>
                          <tbody>
                            <tr>
                              <td style={{ padding: "10px 16px" }}>
                                <table role="presentation" width="100%" cellPadding={0} cellSpacing={0}>
                                  <tbody>
                                    {view.summary.map(([k, v]) => (
                                      <tr key={k}>
                                        <td style={{ padding: "5px 0", fontSize: 14, color: MUTED, width: "34%", fontFamily: FONT, verticalAlign: "top" }}>{k}</td>
                                        <td style={{ padding: "5px 0", fontSize: 14, color: TEXT, fontWeight: "bold", fontFamily: FONT }}>{v}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* Tételek */}
                    <tr>
                      <td style={{ padding: "12px 28px 4px" }}>
                        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse" }}>
                          <tbody>
                            <tr>
                              <td style={{ ...cell, fontSize: 12, color: MUTED, textTransform: "uppercase", letterSpacing: 1 }}>Megnevezés</td>
                              <td style={{ ...cell, fontSize: 12, color: MUTED, textTransform: "uppercase", letterSpacing: 1, textAlign: "right" }}>Összeg</td>
                            </tr>
                            {view.lines.map((l, i) => (
                              <tr key={`${l.label}-${i}`}>
                                <td style={{ ...cell, color: TEXT, paddingRight: 12 }}>
                                  {l.label}
                                  {l.qty ? (
                                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                                      {l.qty}
                                      {l.unitPrice ? ` × ${l.unitPrice}` : ""}
                                    </div>
                                  ) : null}
                                </td>
                                <td style={{ ...cell, textAlign: "right", whiteSpace: "nowrap", color: l.negative ? "#3A5A3C" : TEXT }}>{l.amount}</td>
                              </tr>
                            ))}
                            <tr>
                              <td style={{ padding: "12px 0 4px", fontSize: 16, fontWeight: "bold", color: TEXT, fontFamily: FONT }}>ÖSSZESEN</td>
                              <td style={{ padding: "12px 0 4px", fontSize: 18, fontWeight: "bold", color: TEXT, fontFamily: FONT, textAlign: "right", whiteSpace: "nowrap" }}>
                                {view.total}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>

                    {/* Foglaló */}
                    {view.deposit ? (
                      <tr>
                        <td style={{ padding: "12px 28px 4px" }}>
                          <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ background: "#EEF3EE", border: "1px solid #C5D5C5", borderRadius: 8 }}>
                            <tbody>
                              <tr>
                                <td style={{ padding: "14px 18px", fontFamily: FONT }}>
                                  <div style={{ fontSize: 12, color: brand.accentColor, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1 }}>
                                    Foglaló ({view.deposit.percent}%)
                                  </div>
                                  <div style={{ fontSize: 22, fontWeight: "bold", color: TEXT, margin: "4px 0" }}>{view.deposit.amount}</div>
                                  <div style={{ fontSize: 14, color: TEXT, lineHeight: "21px" }}>{view.deposit.due}</div>
                                  <div style={{ fontSize: 13, color: MUTED, lineHeight: "20px", marginTop: 6 }}>
                                    {view.deposit.terms}{" "}
                                    <a href={view.aszfUrl} style={{ color: brand.accentColor }}>Részletek az ÁSZF-ben</a>
                                  </div>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    ) : null}

                    {/* Elfogadás */}
                    <tr>
                      <td style={{ padding: "16px 28px 4px" }}>
                        {acceptSlot ?? <Button href={view.acceptUrl} color={brand.accentColor}>Elfogadom az ajánlatot</Button>}
                        <p style={{ margin: "10px 0 0", fontSize: 13, color: MUTED, fontFamily: FONT }}>{view.validity}</p>
                      </td>
                    </tr>
                  </>
                )}

                <tr>
                  <td style={{ padding: "12px 28px 16px" }}>
                    <Paragraph>
                      Kérdése van? Válaszoljon erre a levélre, vagy hívjon minket: <strong>{brand.phone}</strong>
                    </Paragraph>
                    <Paragraph>
                      Szeretettel várjuk:
                      <br />
                      {brand.propertyName}
                    </Paragraph>
                  </td>
                </tr>

                {view.info.length ? (
                  <tr>
                    <td style={{ padding: "0 28px 20px" }}>
                      <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ borderTop: `1px solid ${LINE}` }}>
                        <tbody>
                          <tr>
                            <td style={{ paddingTop: 12, fontSize: 12, lineHeight: "18px", color: MUTED, fontFamily: FONT }}>
                              <div style={{ marginBottom: 4 }}>Tájékoztatás (nem része a végösszegnek):</div>
                              {view.info.map((b) => (
                                <div key={b.title} style={{ marginBottom: 4 }}>
                                  <strong style={{ color: TEXT }}>{b.title}:</strong> {b.items.join(" · ")}
                                </div>
                              ))}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                ) : null}

                <Footer brand={brand} />
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function OfferEmail({ view }: { view: OfferView }) {
  return (
    <html lang="hu">
      <head>
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{view.kind === "betelt" ? view.title : `Árajánlat ${view.number}`}</title>
      </head>
      <body style={{ margin: 0, padding: 0, background: "#F7F5F1" }}>
        <OfferBody view={view} />
      </body>
    </html>
  );
}

// Egyszerű levél (elutasítás): ugyanaz a fejléc és lábléc, személyes szöveggel.
export function SimpleEmail({ brand, title, number, greeting, message }: { brand: Brand; title: string; number?: string; greeting: string; message: string }) {
  return (
    <html lang="hu">
      <head>
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title}</title>
      </head>
      <body style={{ margin: 0, padding: 0, background: "#F7F5F1" }}>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ background: "#F7F5F1", padding: "24px 0" }}>
          <tbody>
            <tr>
              <td align="center">
                <table role="presentation" width={600} cellPadding={0} cellSpacing={0} style={{ maxWidth: 600, width: "100%", background: "#FFFFFF", borderRadius: 10, overflow: "hidden", textAlign: "left" }}>
                  <tbody>
                    <Header brand={brand} title={title} number={number} />
                    <tr>
                      <td style={{ padding: "22px 28px 12px" }}>
                        <Paragraph>{greeting}</Paragraph>
                        <p style={{ margin: "0 0 14px", fontSize: 15, lineHeight: "23px", color: TEXT, fontFamily: FONT, whiteSpace: "pre-line" }}>{message}</p>
                        <Paragraph>
                          Üdvözlettel:
                          <br />
                          {brand.propertyName} · {brand.phone}
                        </Paragraph>
                      </td>
                    </tr>
                    <Footer brand={brand} />
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
