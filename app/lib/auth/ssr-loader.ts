import { MeResponse, type UserInfo } from "./types"

export const loadAuth = async (request: Request): Promise<UserInfo | null> => {
  const cookie = request.headers.get("cookie") ?? ""
  const response = await fetch(new URL("/api/me", request.url), {
    headers: cookie ? { Cookie: cookie } : {},
  })
  if (response.status === 401) return null
  if (!response.ok) {
    throw new Error(`/api/me failed with status ${response.status}`)
  }

  return MeResponse.parse(await response.json()).user
}
