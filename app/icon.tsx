import { ImageResponse } from "next/og";
import { config } from "@/lib/config";

// The browser-tab and home-screen icon: the community's initial on its primary color.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: config.theme.primary,
        color: "#ffffff",
        fontSize: 300,
        fontWeight: 700,
        borderRadius: 96,
      }}
    >
      {config.name.slice(0, 1).toUpperCase()}
    </div>,
    size,
  );
}
