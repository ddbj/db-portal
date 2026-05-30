import { useQuery } from "@tanstack/react-query"

import { fetchLlmHealth, type LlmHealth } from "~/lib/api"

export type LlmAvailability = {
  ready: boolean
  reason?: string
  health: LlmHealth | null
}

export const LLM_AVAILABILITY_STALE_MS = 5 * 60_000

// Dev server only (never under vitest): surface the AI mode even when no LLM is
// configured so the assistant flow can be exercised against a stubbed proposal.
const DEV_STUB = import.meta.env.DEV && import.meta.env.MODE !== "test"

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
    enabled: !DEV_STUB,
  })

  if (DEV_STUB) return { ready: true, health: { status: "ok", model: "dev-stub" } }

  return llmAvailabilityFromHealth(query.data ?? null)
}
