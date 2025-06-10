// vite.config.ts

import UnpluginTypia from "@ryoppippi/unplugin-typia/vite";
import { defineConfig } from "vite";
import checker from "vite-plugin-checker";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  build: {
    target: "node22",
    outDir: "dist",
    ssr: true,
    rollupOptions: {
      input: "src/index.ts",
      output: {
        entryFileNames: "[name].js",
      },
      external: [
        "@fastify/cors",
        "@fastify/websocket",
        "@trpc/server",
        "fastify",
        "zod",
        "typia",
        "@prisma/client",
        "argon2",
      ],
    },
  },
  plugins: [
    tsconfigPaths(),
    checker({
      typescript: {
        tsconfigPath: "./tsconfig.json",
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
      tsconfig: "./tsconfig.json",
    }),
  ],
  ssr: {
    noExternal: true, // or: ['some-local-lib'] if you want to force-bundle some deps
  },
  server: {
    port: 5000,
  },
});
