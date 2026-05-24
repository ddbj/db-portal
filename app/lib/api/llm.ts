import { LlmHealth } from "~/schemas/api-bff/llm"

import { buildRequestInit, joinUrl } from "./client"
import { toAPIError } from "./errors"

export { LlmHealth } from "~/schemas/api-bff/llm"

const HEALTH_PATH = "/api/llm/health"

export type FetchLlmHealthOptions = {
  baseUrl?: string
  signal?: AbortSignal
  headers?: HeadersInit
}

export const fetchLlmHealth = async (
  options: FetchLlmHealthOptions = {},
): Promise<LlmHealth> => {
  const init = buildRequestInit({
    method: "GET",
    baseUrl: options.baseUrl,
    signal: options.signal,
    headers: options.headers,
  })
  const response = await fetch(joinUrl(options.baseUrl, HEALTH_PATH), init)
  if (!response.ok) throw await toAPIError(response)

  return LlmHealth.parse(await response.json())
}

export const isLlmAvailable = (health: LlmHealth): boolean =>
  health.status === "ok"
