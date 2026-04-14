// vite.config.js
// PURPOSE: Vite build tool configuration. Sets up React plugin and dev server port.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Default Vite dev server port
  },
});
