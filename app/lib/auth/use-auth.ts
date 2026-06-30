import { useQuery } from "@tanstack/react-query"

import { isAPIError, toAPIError } from "~/lib/api/errors"

import { type AuthState, MeResponse } from "./types"

const ME_RETRY_LIMIT = 2

// Global shouldRetry only retries APIError ≥500, so a network blip (TypeError /
// CORS preflight / aborted DNS) surfaces as a permanent error and RequireAuth
// is pinned to the loading fallback until the next focus / reconnect event.
// /api/me is a cheap idempotent BFF call — retry transient non-APIError throws.
export const meShouldRetry = (failureCount: number, error: unknown): boolean => {
  if (error instanceof Error && error.name === "AbortError") return false
  if (isAPIError(error)) return error.status >= 500 && failureCount < ME_RETRY_LIMIT

  return failureCount < ME_RETRY_LIMIT
}

export const useAuth = (): AuthState => {
  const q = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me", { credentials: "include" })
      // Only an explicit 401 is a definitive "not logged in"; any other failure
      // is transient and is surfaced as an error (retryable for 5xx) rather than
      // a false "unauthenticated" that would bounce the user into a login loop.
      if (res.status === 401) return null
      if (!res.ok) throw await toAPIError(res)

      return MeResponse.parse(await res.json())
    },
    staleTime: 5 * 60_000,
    retry: meShouldRetry,
  })

  // null = confirmed anonymous (401); undefined = still loading or errored
  // without a prior result. Only the confirmed-anonymous case redirects.
  if (q.data === null) return { status: "unauthenticated" }
  if (q.data) return { status: "authenticated", user: q.data.user }

  return { status: "loading" }
}
