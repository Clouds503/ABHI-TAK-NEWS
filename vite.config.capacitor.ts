// Mobile / Capacitor SPA build — no SSR, no Nitro, no TanStack Start server.
// Run via: npm run build:mobile
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import path from "path";

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      routesDirectory: "./src/routes",
      generatedRouteTree: "./src/routeTree.gen.ts",
      quoteStyle: "single",
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "node:async_hooks": path.resolve(__dirname, "./src/lib/async-hooks-polyfill.ts"),
      async_hooks: path.resolve(__dirname, "./src/lib/async-hooks-polyfill.ts"),
    },
    dedupe: ["react", "react-dom"],
  },
  define: {
    // Provide a no-op process.env so SSR-fallback branches in supabase client don't crash
    "process.env": "{}",
    "process.env.NODE_ENV": '"production"',
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    target: "es2020",
    rollupOptions: {
      input: {
        // Vite will output the HTML as index.html in outDir
        index: "index.capacitor.html",
      },
      output: {
        // Rename the entry HTML to index.html so Capacitor finds it
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
