import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import clsx from "clsx";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://vikivendeghaz.hu"),
  title: {
    template: "%s | Viki Vendégház",
    default: "Viki Vendégház – Szilvásvárad",
  },
  description:
    "Vendégház sóbarlanggal, szaunával és wellness lehetőségekkel Szilvásvárad szívében.",
  openGraph: {
    siteName: "Viki Vendégház",
    locale: "hu_HU",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LodgingBusiness",
  name: "Viki Vendégház",
  url: "https://vikivendeghaz.hu",
  telephone: "+36704108282",
  email: "vikivendeghaz@gmail.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Dózsa György utca 45.",
    addressLocality: "Szilvásvárad",
    postalCode: "3348",
    addressCountry: "HU",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 47.9963,
    longitude: 20.3895,
  },
  description:
    "Vendégház sóbarlanggal, finn szaunával, infraszaunával és dézsafürdővel Szilvásvárad szívében, a Szalajka-völgy és a Bükki Nemzeti Park közelében.",
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "Sóbarlang", value: true },
    { "@type": "LocationFeatureSpecification", name: "Finn szauna", value: true },
    { "@type": "LocationFeatureSpecification", name: "Infraszauna", value: true },
    { "@type": "LocationFeatureSpecification", name: "Dézsafürdő", value: true },
    { "@type": "LocationFeatureSpecification", name: "Ingyenes WiFi", value: true },
    { "@type": "LocationFeatureSpecification", name: "Ingyenes parkoló", value: true },
  ],
  numberOfRooms: 3,
  checkinTime: "15:00",
  checkoutTime: "10:00",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="hu"
      className={clsx(dmSans.variable, "antialiased scroll-smooth")}
    >
      <body className="font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
