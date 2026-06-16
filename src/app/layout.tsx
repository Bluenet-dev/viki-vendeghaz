import type { Metadata } from "next";
import { Fraunces, Work_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import clsx from "clsx";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-work-sans",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-ibm-plex-mono",
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="hu"
      className={clsx(
        fraunces.variable,
        workSans.variable,
        ibmPlexMono.variable,
        "antialiased scroll-smooth"
      )}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
