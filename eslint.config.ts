import js from "@eslint/js"
import stylistic from "@stylistic/eslint-plugin"
import vitest from "@vitest/eslint-plugin"
import importPlugin from "eslint-plugin-import"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import simpleImportSort from "eslint-plugin-simple-import-sort"
import globals from "globals"
import tseslint from "typescript-eslint"

const HEX_LITERAL_RULE = {
  selector: "Literal[value=/^#[0-9A-Fa-f]{3,8}$/]",
  message: "生 hex 禁止。app/styles/tailwind.css の @theme token を utility class (例: bg-brand) 経由で参照する。token が無い色は @theme に追加してから使う。",
}

const ARBITRARY_CLASSNAME_RULE = {
  selector: "JSXAttribute[name.name='className'] Literal[value=/\\[(#[0-9A-Fa-f]{3,8}|-?\\d+(\\.\\d+)?(px|rem|em|%))\\]/]",
  message: "Tailwind arbitrary value 禁止。@theme token を utility class 経由で参照する。token が無い値は @theme に追加してから使う。",
}

export default tseslint.config(
  {
    ignores: [
      ".claude/",
      ".react-router/",
      "build/",
      "node_modules/",
      "playwright-report/",
      "repos/",
      "test-results/",
      "app/lib/api/openapi-types.ts",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,

  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "detect" },
      "import/resolver": {
        typescript: { project: "./tsconfig.json" },
        node: true,
      },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "@stylistic": stylistic,
      "simple-import-sort": simpleImportSort,
      import: importPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/function-component-definition": ["error", {
        namedComponents: "arrow-function",
        unnamedComponents: "arrow-function",
      }],

      "func-style": ["error", "expression"],
      "prefer-arrow-callback": "error",

      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/array-type": ["error", { default: "array" }],
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      }],

      "no-console": "warn",

      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",

      "import/no-restricted-paths": ["error", {
        zones: [
          { target: "./app/features/search", from: "./app/features", except: ["./search"] },
          { target: "./app/features/submit", from: "./app/features", except: ["./submit"] },
          { target: "./app/features/news", from: "./app/features", except: ["./news"] },
          { target: "./app/features/services", from: "./app/features", except: ["./services"] },
          { target: "./app/features/auth", from: "./app/features", except: ["./auth"] },
          { target: "./app/features/top", from: "./app/features", except: ["./top"] },
          { target: "./app/features/errors", from: "./app/features", except: ["./errors"] },

          { target: "./app/shell", from: "./app/features" },

          { target: "./app/ui", from: "./app/features" },
          { target: "./app/ui", from: "./app/shell" },
          { target: "./app/ui", from: "./app/lib" },
          { target: "./app/ui", from: "./app/schemas" },
          { target: "./app/ui", from: "./app/content" },

          { target: "./app/lib", from: "./app/features" },
          { target: "./app/lib", from: "./app/shell" },
          { target: "./app/lib", from: "./app/ui" },
          { target: "./app/lib", from: "./app/content" },

          { target: "./app/schemas", from: "./app/features" },
          { target: "./app/schemas", from: "./app/shell" },
          { target: "./app/schemas", from: "./app/ui" },
          { target: "./app/schemas", from: "./app/lib" },
          { target: "./app/schemas", from: "./app/content" },

          { target: "./app/content", from: "./app/features" },
          { target: "./app/content", from: "./app/shell" },

          { target: "./server", from: "./app", except: ["./schemas"] },

          { target: "./app", from: "./server" },
        ],
      }],

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
      "@stylistic/member-delimiter-style": ["error", {
        multiline: { delimiter: "none", requireLast: false },
        singleline: { delimiter: "semi", requireLast: false },
      }],
    },
  },

  {
    files: ["app/{features,routes,content}/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", HEX_LITERAL_RULE, ARBITRARY_CLASSNAME_RULE],
      "react/forbid-elements": ["error", {
        forbid: [
          { element: "button", message: "生 <button> 禁止。 ~/ui の <Button> / <IconButton> を使う。" },
          { element: "a", message: "生 <a> 禁止。 ~/ui の <TextLink> または react-router の <Link> を使う。" },
          { element: "input", message: "生 <input> 禁止。 ~/ui の <FmtRadio> / <FmtCheck> / <SearchBox> / <FacetRow> 等の primitive を使う。" },
          { element: "select", message: "生 <select> 禁止。 ~/ui の <Select> を使う。" },
          { element: "textarea", message: "生 <textarea> 禁止。 form primitive を ~/ui に追加してから使う。" },
        ],
      }],
    },
  },

  {
    files: ["app/{ui,shell}/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", HEX_LITERAL_RULE],
    },
  },

  {
    files: ["app/routes/_design/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },

  {
    files: ["**/*.config.{ts,js,mjs}", "scripts/**/*.{ts,js}"],
    languageOptions: { globals: globals.node },
    rules: {
      "func-style": "off",
      "prefer-arrow-callback": "off",
      "no-console": "off",
    },
  },

  {
    files: ["tests/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      "vitest/expect-expect": "error",
      "@typescript-eslint/no-non-null-assertion": "off",
      "no-console": "off",
    },
  },

  {
    files: ["tests/e2e/**/*.{ts,tsx}"],
    rules: {
      "vitest/expect-expect": "off",
      "vitest/valid-expect": "off",
      "vitest/no-standalone-expect": "off",
    },
  },

  {
    files: ["tests/pbt/**/*.{ts,tsx}"],
    rules: {
      "vitest/no-standalone-expect": "off",
    },
  },
)
