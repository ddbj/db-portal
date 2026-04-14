import js from "@eslint/js"
import stylistic from "@stylistic/eslint-plugin"
import vitest from "@vitest/eslint-plugin"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import simpleImportSort from "eslint-plugin-simple-import-sort"
import tailwindcss from "eslint-plugin-tailwindcss"
import globals from "globals"
import tseslint from "typescript-eslint"

export default tseslint.config(
  {
    ignores: [".react-router/", "build/", "node_modules/"],
  },

  // Base
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,

  // Tailwind
  ...tailwindcss.configs["flat/recommended"],
  {
    settings: {
      tailwindcss: { config: {} },
    },
    rules: {
      "tailwindcss/no-custom-classname": "off",
    },
  },

  // App code
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
    },
    settings: {
      react: { version: "detect" },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "@stylistic": stylistic,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      // React
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/function-component-definition": ["error", {
        namedComponents: "arrow-function",
        unnamedComponents: "arrow-function",
      }],

      // Function style
      "func-style": ["error", "expression"],
      "prefer-arrow-callback": "error",

      // TypeScript
      "@typescript-eslint/consistent-type-imports": ["error", {
        prefer: "type-imports",
      }],
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      }],

      // General
      "no-console": "warn",

      // Import sort
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",

      // Stylistic
      "@stylistic/semi": ["error", "never"],
      "@stylistic/quotes": ["error", "double", { avoidEscape: true }],
      "@stylistic/indent": ["error", 2, { SwitchCase: 1 }],
      "@stylistic/comma-dangle": ["error", "always-multiline"],
      "@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: true }],
      "@stylistic/eol-last": ["error", "always"],
      "@stylistic/jsx-quotes": ["error", "prefer-double"],
      "@stylistic/no-multi-spaces": "error",
      "@stylistic/no-multiple-empty-lines": ["error", { max: 1 }],
      "@stylistic/no-trailing-spaces": "error",
      "@stylistic/object-curly-spacing": ["error", "always"],
      "@stylistic/object-curly-newline": ["error", { consistent: true }],
      "@stylistic/object-property-newline": ["error", { allowAllPropertiesOnSameLine: true }],
      "@stylistic/array-bracket-newline": ["error", "consistent"],
      "@stylistic/array-element-newline": ["error", "consistent"],
      "@stylistic/padding-line-between-statements": ["error", {
        blankLine: "always",
        prev: "*",
        next: "return",
      }],
      "@stylistic/member-delimiter-style": ["error", {
        multiline: { delimiter: "none", requireLast: false },
        singleline: { delimiter: "semi", requireLast: false },
      }],
    },
  },

  // Config files (Node.js globals, relax function style)
  {
    files: ["**/*.config.{ts,js}"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "func-style": "off",
      "prefer-arrow-callback": "off",
    },
  },

  // Test files (unit / component)
  {
    files: ["tests/**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.node,
    },
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/expect-expect": "error",
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-console": "off",
    },
  },

  // E2E tests (Playwright)
  {
    files: ["tests/e2e/**/*.{ts,tsx}"],
    rules: {
      "vitest/expect-expect": "off",
      "vitest/valid-expect": "off",
    },
  },
)
