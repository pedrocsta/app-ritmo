import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/', name: 'RYVMO - Habitos e treinos', short_name: 'RYVMO',
    description: 'Seu espaco privado de habitos, dieta, estudos e academia.',
    start_url: '/', display: 'standalone', background_color: '#080d13',
    theme_color: '#080d13', lang: 'pt-BR',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
