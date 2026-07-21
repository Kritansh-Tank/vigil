import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VIGIL — Industrial Safety Intelligence Platform",
  description:
    "Real-time compound risk detection and safety intelligence for heavy industrial facilities. Powered by AI.",
  keywords: [
    "industrial safety",
    "compound risk detection",
    "permit to work",
    "OISD compliance",
    "gas sensor monitoring",
    "coke oven safety",
    "DGFASLI",
  ],
  authors: [{ name: "VIGIL Safety Systems" }],
  robots: "noindex",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>{children}</body>
    </html>
  );
}
