import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "out-dev/**",
    "build/**",
    "test-results/**",
    "next-env.d.ts",
    // Vendored third-party source: linting upstream code would mean fixing
    // upstream code. Its licence is kept and its derived files are linted.
    "vendor/**",
  ]),
]);

export default eslintConfig;
