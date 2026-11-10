import { describe, expect, it } from "vitest";
import { faqPageJsonLd, lodgingBusinessJsonLd, ldJson, postalAddress } from "./schema";

describe("FAQPage", () => {
  it("minden átadott kérdés bekerül, sorrendben – egy új GYIK-sor magától megjelenik", () => {
    const rows = [
      { question: "Mikor lehet bejelentkezni?", answer: "Érkezés 15:00-tól." },
      { question: "Fogadnak kisállatokat?", answer: "Sajnos nem." },
    ];
    const withNew = [...rows, { question: "Új kérdés?", answer: "Új válasz." }];
    expect(faqPageJsonLd(rows).mainEntity).toHaveLength(2);
    const ld = faqPageJsonLd(withNew);
    expect(ld.mainEntity).toHaveLength(3);
    expect(ld.mainEntity[2]).toEqual({ "@type": "Question", name: "Új kérdés?", acceptedAnswer: { "@type": "Answer", text: "Új válasz." } });
  });

  it("a nyers HTML-ben nem zárhat le script taget", () => {
    expect(ldJson({ a: "</script>" })).not.toContain("</");
  });
});

describe("LodgingBusiness", () => {
  it("a settings címéből PostalAddress lesz", () => {
    expect(postalAddress("3348 Szilvásvárad, Dózsa György utca 45.")).toEqual({
      "@type": "PostalAddress", streetAddress: "Dózsa György utca 45.", addressLocality: "Szilvásvárad", postalCode: "3348", addressCountry: "HU",
    });
  });

  it("nincs benne értékelés vagy csillag", () => {
    const ld = lodgingBusinessJsonLd({
      propertyName: "Viki Vendégház", phone: "+36 70 410-8282", email: "x@example.com", address: "3348 Szilvásvárad, Dózsa György utca 45.",
      checkInFrom: "15:00", checkOutUntil: "10:00", numberOfRooms: 3, description: "d", image: "/galeria/egesz-haz/01.webp",
    });
    expect(ld.telephone).toBe("+36704108282");
    expect(ld.image).toBe("https://www.vikivendeghaz.hu/galeria/egesz-haz/01.webp");
    for (const k of ["aggregateRating", "review", "starRating"]) expect(ld).not.toHaveProperty(k);
  });
});
