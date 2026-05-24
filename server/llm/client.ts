import type { ServerEnv } from "../lib/env"

export type LlmClient = {
  available: boolean
  baseUrl: string | undefined
  model: string
  timeoutMs: number
}

export const createLlmClient = (env: ServerEnv): LlmClient => ({
  available: Boolean(env.DB_PORTAL_LLM_BASE_URL),
  baseUrl: env.DB_PORTAL_LLM_BASE_URL,
  model: env.DB_PORTAL_LLM_MODEL,
  timeoutMs: env.DB_PORTAL_LLM_TIMEOUT_MS,
})
