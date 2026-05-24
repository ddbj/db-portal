import { MeResponse, type UserInfo } from "./types"

const portalOrigin = (): string => {
  const origin = import.meta.env.VITE_DB_PORTAL_PORTAL_ORIGIN
  if (!origin) throw new Error("VITE_DB_PORTAL_PORTAL_ORIGIN is not set")

  return origin
}

export const loadAuth = async (request: Request): Promise<UserInfo | null> => {
  const cookie = request.headers.get("cookie") ?? ""
  const response = await fetch(new URL("/api/me", portalOrigin()), {
    headers: cookie ? { Cookie: cookie } : {},
  })
  if (response.status === 401) return null
  if (!response.ok) {
    throw new Error(`/api/me failed with status ${response.status}`)
  }

  return MeResponse.parse(await response.json()).user
}
