import { useQuery } from "@tanstack/react-query"

import { type AuthState, MeResponse } from "./types"

export const useAuth = (): AuthState => {
  const q = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/me", { credentials: "include" })
      if (res.status === 401) return null

      return MeResponse.parse(await res.json())
    },
    staleTime: 5 * 60_000,
  })

  if (q.isLoading) return { status: "loading" }
  if (!q.data) return { status: "unauthenticated" }

  return { status: "authenticated", user: q.data.user }
}
