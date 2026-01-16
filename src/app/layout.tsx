import type { Metadata } from "next";
import { Inter, Lexend } from "next/font/google";
import "./globals.css";
import clsx from "clsx";
import { Header } from "@/layout/header";
import { Footer } from "@/layout/footer";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const lexend = Lexend({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-lexend",
});

// ALAPVETŐ SEO KONFIGURÁCIÓ
export const metadata: Metadata = {
  // Ez kritikus az OG képekhez! (Később a .env-ből jön majd, most hardcode-oljuk a domaint)
  metadataBase: new URL("https://bluenet.hu"),
  title: {
    template: "%s | BlueNet",
    default: "BlueNet - Prémium Digitális Megoldások",
  },
  description: "A jövő weboldalai, ma. Next.js 16 és Catalyst alapokon.",
  openGraph: {
    siteName: "BlueNet",
    locale: "hu_HU",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="hu"
      className={clsx(
        inter.variable,
        lexend.variable,
        "antialiased scroll-smooth"
      )}
    >
      <body className="font-sans bg-white text-slate-900 min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
