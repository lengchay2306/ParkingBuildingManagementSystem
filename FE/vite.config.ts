// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

// Proxy /api/** through the Nitro server (both dev and prod) so the browser only ever talks
// to its own origin. This avoids the backend CORS restriction AND makes the auth cookies
// first-party (otherwise vercel.app <-> onrender.com cookies are third-party and get blocked).
// Override with VITE_PROXY_TARGET to point at a local backend.
const API_PROXY_TARGET =
  process.env.VITE_PROXY_TARGET ??
  "https://parkingbuildingmanagementsystem.onrender.com";

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
