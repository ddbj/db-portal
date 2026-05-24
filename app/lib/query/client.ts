import { QueryClient } from "@tanstack/react-query"

import { isAPIError } from "~/lib/api/errors"

export const MAX_SERVER_ERROR_RETRIES = 2

export const shouldRetry = (failureCount: number, error: unknown): boolean => {
  if (isAPIError(error) && error.status >= 500) {
    return failureCount < MAX_SERVER_ERROR_RETRIES
  }

  return false
}

export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
      mutations: {
        retry: 0,
      },
    },
  })
