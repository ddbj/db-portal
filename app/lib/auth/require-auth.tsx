import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"

import { useAuth } from "./use-auth"

type RequireAuthProps = {
  children: ReactNode
  fallback?: ReactNode
}

export const RequireAuth = ({ children, fallback }: RequireAuthProps) => {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === "loading") return fallback ?? null
  if (auth.status === "unauthenticated") {
    const returnTo = encodeURIComponent(location.pathname + location.search)

    return <Navigate to={`/api/auth/login?return_to=${returnTo}`} replace />
  }

  return <>{children}</>
}
