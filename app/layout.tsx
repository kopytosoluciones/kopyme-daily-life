import type { Metadata } from "next";
import { Inter, Lora, IBM_Plex_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "kopyme",
  description: "Tu vida, documentada.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${lora.variable} ${ibmPlexMono.variable} ${playfair.variable} h-full`}>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
