import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";

// Vite는 프로젝트 루트(=index.html이 있는 폴더) 바깥의 파일을 import할 때
// fs.allow 또는 publicDir 설정이 필요. 우리는 data/, lib/ 가 루트에 있어
// 별도 설정 없이 import 가능하지만 명시적으로 alias를 둠.
// GitHub Pages 하위 경로 배포 대응:
//   https://monatory.github.io/mjc-career-pwa/ 에서 동작
// CI(GitHub Actions)에서 자동 적용; 로컬 dev에서는 "/" 유지.
// 본 운영 시 학내 도메인(루트)으로 옮길 때는 워크플로 비활성하면 됨.
const IS_PAGES_BUILD =
  process.env.GITHUB_ACTIONS === "true" || process.env.GITHUB_PAGES === "1";
const BASE = IS_PAGES_BUILD ? "/mjc-career-pwa/" : "/";

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    // PWA: 오프라인 캐싱 + 설치 가능.
    // data/*.json은 빌드 시 번들로 import되므로 별도 runtimeCaching 불필요.
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      // public/manifest.webmanifest를 우리가 직접 관리 중. 플러그인 생성 비활성.
      manifest: false,
      includeAssets: [
        "favicon.svg",
        "manifest.webmanifest",
        "icons/icon-192.svg",
        "icons/icon-512.svg",
        "icons/icon-maskable.svg",
      ],
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2,json}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
        type: "module",
        navigateFallback: "index.html",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@data": path.resolve(__dirname, "data"),
      "@lib": path.resolve(__dirname, "lib"),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
