import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the site from /cade-matchups/ (its workflow sets GITHUB_PAGES).
// Vercel and local dev serve it from the root.
export default defineConfig({
  base: process.env.GITHUB_PAGES ? "/cade-matchups/" : "/",
  plugins: [react()],
});
