import { z } from "zod"

import { joinUrl } from "./client"
import { toAPIError } from "./errors"

export const LlmHealth = z.discriminatedUnion("status", [
  z.object({ status: z.literal("unset") }),
  z.object({ status: z.literal("ok"), model: z.string() }),
  z.object({ status: z.literal("unreachable"), reason: z.string() }),
])
export type LlmHealth = z.infer<typeof LlmHealth>

const HEALTH_PATH = "/api/llm/health"

export type FetchLlmHealthOptions = {
  baseUrl?: string
  signal?: AbortSignal
  headers?: HeadersInit
}

export const fetchLlmHealth = async (
  options: FetchLlmHealthOptions = {},
): Promise<LlmHealth> => {
  const response = await fetch(joinUrl(options.baseUrl, HEALTH_PATH), {
    method: "GET",
    headers: { Accept: "application/json", ...options.headers },
    credentials: options.baseUrl ? "same-origin" : "include",
    signal: options.signal ?? null,
  })
  if (!response.ok) throw await toAPIError(response)

  return LlmHealth.parse(await response.json())
}

export const isLlmAvailable = (health: LlmHealth): boolean =>
  health.status === "ok"
