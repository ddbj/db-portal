import { z } from "zod"

export const ClientEnv = z.object({
  VITE_DB_PORTAL_SEARCH_API_URL: z.string().url(),
  VITE_DB_PORTAL_KEYCLOAK_REALM_URL: z.string().url(),
  VITE_DB_PORTAL_KEYCLOAK_CLIENT_ID: z.string().min(1),
  VITE_DB_PORTAL_PORTAL_ORIGIN: z.string().url(),
  VITE_DB_PORTAL_DEFAULT_LANG: z.enum(["ja", "en"]).default("ja"),
})

export type ClientEnv = z.infer<typeof ClientEnv>

export const parseClientEnv = (raw: Record<string, unknown>): ClientEnv =>
  ClientEnv.parse(raw)
