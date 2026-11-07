import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ritmo | Seus h\u00e1bitos, seu progresso",
  description: "Acompanhe h\u00e1bitos, alimenta\u00e7\u00e3o, estudo e treinos em um s\u00f3 lugar.",
  applicationName: "Ritmo",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Ritmo" },
  manifest: "/manifest.webmanifest",
  icons: { icon: [{ url: "/icon-192.png", sizes: "192x192" }], apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f8f4",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
