import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  envDir: "..",
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  publicDir: "../public",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("../src", import.meta.url)),
    },
    // Shared UI lives one directory above `desktop` and would otherwise resolve
    // React from the root node_modules. Hooks must always use the renderer's
    // single React instance or Tauri starts with an empty white window.
    dedupe: ["react", "react-dom"],
  },
  server: {
    host: "127.0.0.1",
    // Shared source and the canonical Geist font live in the repository root.
    // Keep the allow-list narrow while letting Vite serve those files in dev.
    fs: {
      allow: [fileURLToPath(new URL("..", import.meta.url))],
    },
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
