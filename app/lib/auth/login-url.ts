const LOGIN_PATH = "/api/auth/login"
const LOGOUT_PATH = "/api/auth/logout"

const isSameOriginPath = (returnTo: string): boolean => {
  if (!returnTo.startsWith("/")) return false
  if (returnTo.startsWith("//")) return false
  if (returnTo.startsWith("/\\")) return false

  return true
}

const withReturnTo = (path: string, returnTo: string | undefined): string => {
  if (returnTo === undefined) return path
  const safe = isSameOriginPath(returnTo) ? returnTo : "/"
  const params = new URLSearchParams({ return_to: safe })

  return `${path}?${params.toString()}`
}

export const buildLoginUrl = (returnTo?: string): string =>
  withReturnTo(LOGIN_PATH, returnTo)

export const buildLogoutUrl = (returnTo?: string): string =>
  withReturnTo(LOGOUT_PATH, returnTo)
