import { parse, serialize } from "cookie"

// __Host- prefix は Secure + Path=/ + Domain 未指定を要求する (WICG spec)。
// dev (HTTP) では Secure=false なため prefix 付き名は set できず、 前置なしの
// `sid` に fallback する。 server は cookie header parse 時に両方を lookup する。
const COOKIE_NAME_SECURE = "__Host-sid"
const COOKIE_NAME_INSECURE = "sid"

type CookieOptions = {
  secure: boolean
}

const cookieName = (secure: boolean): string =>
  secure ? COOKIE_NAME_SECURE : COOKIE_NAME_INSECURE

export const setSidCookie = (sid: string, opts: CookieOptions): string =>
  serialize(cookieName(opts.secure), sid, {
    httpOnly: true,
    secure: opts.secure,
    sameSite: "lax",
    path: "/",
  })

export const clearSidCookie = (opts: CookieOptions): string =>
  serialize(cookieName(opts.secure), "", {
    httpOnly: true,
    secure: opts.secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })

export const getSidFromHeader = (cookieHeader: string | undefined): string | undefined => {
  if (!cookieHeader) return undefined
  const parsed = parse(cookieHeader)

  return parsed[COOKIE_NAME_SECURE] ?? parsed[COOKIE_NAME_INSECURE]
}
