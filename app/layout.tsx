import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'RYVMO | Seu progresso, todos os dias',
  description: 'Seu painel privado de habitos, dieta, estudos e treinos. Progresso pessoal em um so lugar.',
  applicationName: 'RYVMO',
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'RYVMO' },
  manifest: '/manifest.webmanifest',
  icons: { icon: [{ url: '/icon-192.png', sizes: '192x192' }], apple: '/apple-touch-icon.png' },
};
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#080d13',
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
