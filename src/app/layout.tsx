import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dig — Follow the sound.",
  description: "Interactive music discovery prototype",
  // Discogs artwork hotlinks 403 when a Referer is sent; same-origin
  // /api calls don't need one.
  referrer: "no-referrer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-bg font-sans text-text antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
