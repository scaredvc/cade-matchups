import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the site from /cade-matchups/.
export default defineConfig({ base: "/cade-matchups/", plugins: [react()] });
