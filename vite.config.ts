import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import { legacyColorFallback } from "./vite-plugin-legacy-colors";

// Id of this build (Vercel: the commit sha) — compared with GET /api/version by lib/version-watch.ts to notice "a new version was released while this tab was open".
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA ?? "";

export default defineConfig({
  define: { "import.meta.env.VITE_BUILD_ID": JSON.stringify(BUILD_ID) },
  server: {
    port: 5174,
    strictPort: true,
    warmup: {
      ssrFiles: [
        "./src/server.ts",
        "./src/lib/error-page.ts",
        "./src/lib/error-capture.ts",
      ],
      clientFiles: [
        "./src/router.tsx",
        "./src/start.ts",
      ],
    },
  },
  plugins: [
    tailwindcss(),
    legacyColorFallback(), // production only: oklch() -> sRGB so Chrome <= 110 (Windows 7/8 laptops) renders backgrounds/colours
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart(),
    nitro(),
    react(),
  ],
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
    ignoreOutdatedRequests: true,
  },
});
