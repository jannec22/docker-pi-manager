// vite.config.ts

import UnpluginTypia from "@ryoppippi/unplugin-typia/vite";
import { defineConfig } from "vite";
import viteTtsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	build: {
		target: "node22",
		outDir: "dist",
		ssr: true,
		rollupOptions: {
			input: "src/client.ts",
			output: {
				entryFileNames: "[name].js",
			},
			external: ["typia", "argon2", "ws", "@trpc/client", "@trpc/server"],
		},
	},
	plugins: [
		viteTtsconfigPaths(),
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
