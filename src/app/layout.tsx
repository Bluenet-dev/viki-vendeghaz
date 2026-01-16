import type { Metadata } from "next";
import { Inter, Lexend } from "next/font/google";
import "./globals.css";
import clsx from "clsx";

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

export const metadata: Metadata = {
  title: "BlueNet Core",
  description: "BlueNet Headquarters - Powered by Catalyst",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="hu"
      className={clsx(inter.variable, lexend.variable, "antialiased")}
    >
      <body className="font-sans bg-white text-slate-900">{children}</body>
    </html>
  );
}
