import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["apple-touch-icon.png"],
      manifest: {
        name: "TokMap - TikTokで探すお店マップ",
        short_name: "TokMap",
        description: "TikTokの動画でお店を探せるマップ",
        lang: "ja",
        display: "standalone",
        orientation: "portrait",
        background_color: "#111111",
        theme_color: "#111111",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Google マップ・TikTok・/api は常にネットから取る（画面の骨組みだけキャッシュ）
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
});
