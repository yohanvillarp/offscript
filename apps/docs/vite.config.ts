import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

const local = (path: string) => fileURLToPath(new URL(path, import.meta.url));
export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      { find: "@/shared/ui/raven-mascot/raven-mascot.css", replacement: local("../studio/src/shared/ui/raven-mascot/raven-mascot.css") },
      { find: "@studio", replacement: local("../studio/src") },
      { find: "@", replacement: local("./src") },
    ],
  },
});
