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
    <html lang="en" className="dark">
      <body className="bg-bg text-zinc-100 antialiased overflow-hidden">
        {children}
      </body>
    </html>
  );
}
