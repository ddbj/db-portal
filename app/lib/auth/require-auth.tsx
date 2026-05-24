import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"

import { buildLoginUrl } from "./login-url"
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
    return <Navigate to={buildLoginUrl(location.pathname + location.search)} replace />
  }

  return <>{children}</>
}
