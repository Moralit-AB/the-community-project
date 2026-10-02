import type { MetadataRoute } from "next";
import { config, localized } from "@/lib/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: config.name,
    short_name: config.shortName,
    description: localized(config.description, config.defaultLocale),
    start_url: "/home",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
