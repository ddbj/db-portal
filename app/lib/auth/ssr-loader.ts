import { MeResponse, type UserInfo } from "./types"

const portalOrigin = (): string => {
  const origin = import.meta.env.VITE_DB_PORTAL_PORTAL_ORIGIN
  if (!origin) throw new Error("VITE_DB_PORTAL_PORTAL_ORIGIN is not set")

  return origin
}

export const loadAuth = async (request: Request): Promise<UserInfo | null> => {
  const cookie = request.headers.get("cookie") ?? ""
  // client 切断時に SSR loader の上流 fetch を即時中断する。 request.signal を
  // 直接 forward すると別 realm / msw interceptor の AbortSignal 厳格検査に
  // 引っかかるため、 同 realm の新規 AbortController を作って abort を伝搬する。
  const controller = new AbortController()
  if (request.signal) {
    if (request.signal.aborted) controller.abort()
    else request.signal.addEventListener("abort", () => controller.abort(), { once: true })
  }
  const response = await fetch(new URL("/api/me", portalOrigin()), {
    headers: cookie ? { Cookie: cookie } : {},
    signal: controller.signal,
  })
  if (response.status === 401) return null
  if (!response.ok) {
    throw new Error(`/api/me failed with status ${response.status}`)
  }

  return MeResponse.parse(await response.json()).user
}
