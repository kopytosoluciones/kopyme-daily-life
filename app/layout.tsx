import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import "./globals.css";

const grotesk = Space_Grotesk({
  variable: "--font-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "kopyme",
  description: "Tu vida, documentada.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <html
      lang="es"
      data-theme={theme === "system" ? undefined : theme}
      suppressHydrationWarning
      className={`${grotesk.variable} ${mono.variable} h-full`}
    >
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
