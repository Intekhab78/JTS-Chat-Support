import { defineConfig } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

export default defineConfig({
  plugins: [cssInjectedByJsPlugin()],
  build: {
    cssCodeSplit: false,
    lib: {
      entry: "src/main.js",
      name: "ChatWidget",
      fileName: "chat-widget",
      formats: ["iife"]
    }
  }
});
