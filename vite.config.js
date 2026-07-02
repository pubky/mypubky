import { defineConfig } from "vite";
import packageJson from "./package.json" with { type: "json" };

const appVersion = process.env.npm_package_version || packageJson.version;

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  },
  server: {
    host: true,
    port: 4175
  }
});
