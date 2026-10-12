import { Barlow, Barlow_Semi_Condensed, Familjen_Grotesk } from "next/font/google";

// Barlow draws on highway and rail signage, which suits heavy-equipment work.
export const fontSans = Barlow({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const fontDisplay = Barlow_Semi_Condensed({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

// Only used for the "cota" wordmark.
export const fontBrand = Familjen_Grotesk({
  subsets: ["latin"],
  variable: "--font-brand",
  display: "swap",
  weight: ["700"],
});
