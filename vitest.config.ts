import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Unit tests run in jsdom so the market/ledger modules (which persist to
// localStorage) behave exactly as they do in the browser. The `@` alias matches
// tsconfig.json so imports stay identical to the app.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.ts"],
    globals: true,
    setupFiles: ["./tests/unit/setup.ts"],
  },
});
