import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
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
