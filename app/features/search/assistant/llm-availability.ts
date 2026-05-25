import { useQuery } from "@tanstack/react-query"

import { fetchLlmHealth, type LlmHealth } from "~/lib/api"

export type LlmAvailability = {
  ready: boolean
  reason?: string
  health: LlmHealth | null
}

export const LLM_AVAILABILITY_STALE_MS = 5 * 60_000

export const llmAvailabilityFromHealth = (health: LlmHealth | undefined | null): LlmAvailability => {
  if (!health) return { ready: false, health: null }
  switch (health.status) {
    case "ok":
      return { ready: true, health }
    case "unreachable":
      return { ready: true, reason: health.reason, health }
    case "unset":
      return { ready: false, reason: "unset", health }
  }
}

export const useLlmAvailability = (): LlmAvailability => {
  const query = useQuery({
    queryKey: ["llm", "health"],
    queryFn: () => fetchLlmHealth(),
    staleTime: LLM_AVAILABILITY_STALE_MS,
  })

  return llmAvailabilityFromHealth(query.data ?? null)
}
