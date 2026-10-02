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
    theme_color: config.theme.primary,
    icons: [{ src: "/icon", sizes: "512x512", type: "image/png" }],
  };
}
