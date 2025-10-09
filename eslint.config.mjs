import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";
import unused from "eslint-plugin-unused-imports";

export default tseslint.config(
  { ignores: ["dist/**", "**/*.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: true, // auto-detect tsconfig.json
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      import: importPlugin,
      "unused-imports": unused
    },
    rules: {
      "no-console": "off",
      "unused-imports/no-unused-imports": "warn",
      "import/order": [
        "warn",
        {
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
          groups: ["builtin", "external", "internal", ["parent", "sibling", "index"]]
        }
      ]
    }
  }
);
