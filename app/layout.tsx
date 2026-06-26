import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parapantabil.ro | Verificare meteo de zbor",
  description:
    "Consolă meteo în limba română pentru verificarea condițiilor parapantabile.",
  icons: {
    icon: "/parapantabil-logo.png",
    shortcut: "/parapantabil-logo.png",
    apple: "/parapantabil-logo.png",
  },
  openGraph: {
    title: "Parapantabil.ro | Verificare meteo de zbor",
    description:
      "Consolă meteo în limba română pentru verificarea condițiilor parapantabile.",
    images: ["/parapantabil-logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
