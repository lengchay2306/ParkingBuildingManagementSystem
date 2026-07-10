// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

// vite.config runs before Vite injects .env into process.env — load explicitly.
const mode =
  process.env.NODE_ENV === "production" || process.argv.includes("build")
    ? "production"
    : "development";
const env = loadEnv(mode, process.cwd(), "");

// Override with VITE_PROXY_TARGET in .env.development to point at a local backend.
const API_PROXY_TARGET =
  (process.env.VITE_PROXY_TARGET || env.VITE_PROXY_TARGET || "").trim() ||
  "https://parkingbuildingmanagementsystem.onrender.com";

console.log(`[vite] /api proxy → ${API_PROXY_TARGET}`);

export default defineConfig({
  plugins: [
    nitro({
      routeRules: {
        // Nitro strips the "/api" base from a "/api/**" rule, so the target must re-add it:
        // /api/v1/auth/login -> <target>/api/v1/auth/login
        "/api/**": { proxy: { to: `${API_PROXY_TARGET}/api/**` } },
      },
    }),
  ],
});
