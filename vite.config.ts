import path from "node:path"
import { fileURLToPath } from "node:url"

import { reactRouter } from "@react-router/dev/vite"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vitest/config"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const isTest = process.env.VITEST === "true"

export default defineConfig({
  plugins: [
    tailwindcss(),
    ...(isTest ? [] : [reactRouter()]),
  ],
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./app"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: Number(process.env.DB_PORTAL_APP_INTERNAL_PORT ?? 3000),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/unit/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/pbt/**/*.{test,pbt.test}.{ts,tsx}"],
    exclude: ["tests/e2e/**", "node_modules/**", "build/**", ".react-router/**"],
    passWithNoTests: true,
  },
})
