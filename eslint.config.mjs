import eslint from "@eslint/js";
import sortImportPlugin from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      ".nyc_output",
      ".vscode*",
      "**/__snapshots__",
      "**/*dist/",
      "coverage",
      "node_modules",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.mocha,
        ...globals.node,
      },
    },
    plugins: {
      "simple-import-sort": sortImportPlugin,
    },
    rules: {
      "@typescript-eslint/no-duplicate-enum-values": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "simple-import-sort/exports": "error",
      "simple-import-sort/imports": "error",
    },
  },
);
