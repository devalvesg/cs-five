import type { Metadata } from "next";
import { Oxanium, Barlow_Semi_Condensed } from "next/font/google";
import "./globals.css";

const oxanium = Oxanium({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-oxanium",
  display: "swap",
});
const barlow = Barlow_Semi_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CS-FIVE — Daily Counter-Strike Games",
  description:
    "Jogos diários sobre Counter-Strike (CS:GO + CS2): Grid e Top 10. Um novo desafio todo dia à meia-noite UTC.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${oxanium.variable} ${barlow.variable}`}>
      <body>{children}</body>
    </html>
  );
}
