import type { Metadata, Viewport } from "next";
import {
  Archivo_Black,
  Barlow_Condensed,
  Caveat,
  Courier_Prime,
  IBM_Plex_Mono,
  Instrument_Serif,
  Inter,
  Inter_Tight,
  Kalam,
  Manrope,
  Playfair_Display,
  Source_Serif_4,
  Space_Grotesk,
  Space_Mono,
} from "next/font/google";
import "./globals.css";
import "./slide-styles/minimal.css";
import "./slide-styles/sketch.css";
import "./slide-styles/newspaper.css";
import "./slide-styles/collage.css";
import "./slide-styles/swiss.css";
import "./slide-styles/tech.css";
import "./slide-styles/orbital.css";
import "./slide-styles/manga.css";
import "./slide-styles/mde.css";
import "./slide-styles/brutalist.css";
import "./slide-styles/canvas.css";

const ui = Inter({ subsets: ["latin"], variable: "--font-ui", display: "swap" });
const head = Inter_Tight({ subsets: ["latin"], variable: "--font-head", display: "swap" });
const quote = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-quote", display: "swap" });

// Post styles (see lib/styles.ts)
const caveat = Caveat({ subsets: ["latin"], variable: "--font-caveat", display: "swap" });
const kalam = Kalam({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-kalam", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-playfair", display: "swap" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-source-serif", display: "swap" });
const archivoBlack = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--font-archivo-black", display: "swap" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono", display: "swap" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const courier = Courier_Prime({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-courier", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-plex-mono", display: "swap" });
const barlowCondensed = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "800"], variable: "--font-barlow-condensed", display: "swap" });

const fontVars = [ui, head, quote, caveat, kalam, playfair, sourceSerif, archivoBlack, spaceMono, spaceGrotesk, manrope, courier, plexMono, barlowCondensed]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  title: "Carrossel — notícia vira carrossel",
  description: "Cole o link de uma notícia e receba um carrossel pronto para postar.",
};

export const viewport: Viewport = {
  themeColor: "#f6f6f3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={fontVars}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
