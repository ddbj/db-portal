import { parse, serialize } from "cookie"

export const COOKIE_NAME = "sid"

export type CookieOptions = {
  secure: boolean
}

export const setSidCookie = (sid: string, opts: CookieOptions): string =>
  serialize(COOKIE_NAME, sid, {
    httpOnly: true,
    secure: opts.secure,
    sameSite: "lax",
    path: "/",
  })

export const clearSidCookie = (opts: CookieOptions): string =>
  serialize(COOKIE_NAME, "", {
    httpOnly: true,
    secure: opts.secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  })

export const getSidFromHeader = (cookieHeader: string | undefined): string | undefined => {
  if (!cookieHeader) return undefined

  return parse(cookieHeader)[COOKIE_NAME]
}
