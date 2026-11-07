import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Ritmo - H\u00e1bitos e treinos",
    short_name: "Ritmo",
    description: "Seu painel pessoal de h\u00e1bitos, dieta e academia.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f8f4",
    theme_color: "#f7f8f4",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
