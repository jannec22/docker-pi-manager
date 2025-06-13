import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import UnpluginTypia from "@ryoppippi/unplugin-typia/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import tsconfigPaths from "vite-tsconfig-paths";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    checker({
      typescript: {
        tsconfigPath: "./tsconfig.app.json",
      },
      biome: {
        build: { flags: "--fix" },
        dev: { flags: "--fix" },
      },
    }),
    UnpluginTypia({
      tsconfig: "./tsconfig.app.json",
    }),
    react(),
    tailwindcss(),
  ],
  build: {
    outDir: "../backend/public",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:5000",
      "/ws": {
        target: "ws://localhost:5000",
        ws: true,
      },
    },
  },
});
