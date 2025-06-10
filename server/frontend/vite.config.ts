import UnpluginTypia from "@ryoppippi/unplugin-typia/vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tsconfigPaths(),
    checker({
      typescript: {
        tsconfigPath: "./tsconfig.app.json",
      },
      biome: {
        build: {
          flags: "--fix",
        },
        dev: {
          flags: "--fix",
        },
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
