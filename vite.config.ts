import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages project site lives under https://castaso.github.io/CASTAFREE/,
// so the Pages workflow builds with GH_PAGES=true. Freebuff/root hosting and
// local dev keep the default "/" base.
const base = process.env.GH_PAGES === "true" ? "/CASTAFREE/" : "/";

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@generated": fileURLToPath(new URL("./convex/_generated", import.meta.url)),
    },
  },
  server: {
    host: true,
    port: Number(process.env.PORT) || 3000,
    hmr: false,
  },
});
