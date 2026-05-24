import { z } from "zod"

const optionalString = z.string().trim().min(1).optional().or(z.literal("").transform(() => undefined))

const numberFromString = (defaultValue: number) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === "") return defaultValue
      const n = typeof v === "number" ? v : Number(v)

      return Number.isFinite(n) ? n : defaultValue
    })

export const ServerEnv = z.object({
  DB_PORTAL_ENV: z.enum(["dev", "staging", "production"]).default("dev"),
  DB_PORTAL_APP_INTERNAL_PORT: numberFromString(3000),
  DB_PORTAL_PORTAL_ORIGIN: z.string().url(),
  DB_PORTAL_LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  DB_PORTAL_DEFAULT_LANG: z.enum(["ja", "en"]).default("ja"),
  DB_PORTAL_SEARCH_API_URL: z.string().url(),
  DB_PORTAL_SEARCH_API_TIMEOUT_MS: numberFromString(10000),
  DB_PORTAL_OPENAPI_URL: z.string().url(),
  DB_PORTAL_KEYCLOAK_REALM_URL: z.string().url(),
  DB_PORTAL_KEYCLOAK_CLIENT_ID: z.string().min(1),
  DB_PORTAL_LLM_BASE_URL: optionalString,
  DB_PORTAL_LLM_API_KEY: optionalString,
  DB_PORTAL_LLM_MODEL: z.string().default("Qwen/Qwen2.5-32B-Instruct-AWQ"),
  DB_PORTAL_LLM_TIMEOUT_MS: numberFromString(60000),
  DB_PORTAL_NEWS_MIRROR_REPO: z.string().default("ddbj/www"),
  DB_PORTAL_NEWS_MIRROR_BRANCH: z.string().default("main"),
  DB_PORTAL_NEWS_MIRROR_INTERVAL_SECONDS: numberFromString(1800),
  DB_PORTAL_NEWS_MIRROR_GITHUB_TOKEN: optionalString,
  DB_PORTAL_NEWS_CACHE_DIR: z.string().default("/var/cache/db-portal/news"),
})

export type ServerEnv = z.infer<typeof ServerEnv>

export const parseServerEnv = (raw: NodeJS.ProcessEnv = process.env): ServerEnv =>
  ServerEnv.parse(raw)
