import { QueryClient } from "@tanstack/react-query"

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  })

export const queryClient = createQueryClient()
