import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parapantabil.ro | Verificare meteo de zbor",
  description:
    "Consolă meteo în limba română pentru verificarea condițiilor parapantabile.",
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
    <html lang="ro">
      <body>{children}</body>
    </html>
  );
}
