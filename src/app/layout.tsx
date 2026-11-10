import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import clsx from "clsx";
import { CookieBanner } from "@/components/cookie-banner";

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

// A LodgingBusiness séma a főoldalon van (src/app/(marketing)/page.tsx), a
// settings táblából; a GYIK-oldal saját FAQPage-et ad.

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="hu"
      className={clsx(dmSans.variable, "antialiased scroll-smooth")}
    >
      <body className="font-sans">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
