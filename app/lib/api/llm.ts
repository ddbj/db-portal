import { LlmHealth } from "~/schemas/api-bff/llm"

import { fetchBffJson } from "./client"

export { LlmHealth } from "~/schemas/api-bff/llm"

const HEALTH_PATH = "/api/llm/health"

type FetchLlmHealthOptions = {
  baseUrl?: string
  signal?: AbortSignal
  headers?: HeadersInit
}

export const fetchLlmHealth = (options: FetchLlmHealthOptions = {}): Promise<LlmHealth> =>
  fetchBffJson(HEALTH_PATH, options, LlmHealth)

export const isLlmAvailable = (health: LlmHealth): boolean =>
  health.status === "ok"
