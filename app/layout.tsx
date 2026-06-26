import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paraglider Weather Check",
  description:
    "Current and forecast flight suitability checks for manual paragliding.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
