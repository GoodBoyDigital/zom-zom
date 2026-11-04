import { defineConfig } from "vite";

/** Builds src/embed.ts as one classic script; scripts/build-embed.mjs wraps it in an HTML file. */
export default defineConfig({
  publicDir: false,
  build: {
    outDir: "dist-embed",
    emptyOutDir: true,
    lib: {
      entry: "src/embed.ts",
      formats: ["iife"],
      name: "ZomZoms",
      fileName: () => "embed.js",
    },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
    // Library mode keeps `process.env.NODE_ENV` as-is; motion (menu tweens) reads it.
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
