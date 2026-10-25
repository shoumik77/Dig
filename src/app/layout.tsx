import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dig — Follow the sound.",
  description: "Interactive music discovery prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
