import { defineConfig } from "vite";

const appVersion = process.env.npm_package_version;

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion)
  },
  server: {
    host: true,
    port: 4175
  }
});
