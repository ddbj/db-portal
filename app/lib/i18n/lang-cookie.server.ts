import { parse, serialize } from "cookie"

import type { Lang } from "./use-lang"

export const LANG_COOKIE_NAME = "db_portal_lang"

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

type LangCookieOptions = {
  secure: boolean
}

const isLang = (value: string | undefined): value is Lang =>
  value === "ja" || value === "en"

// dev runs over plain HTTP; every other environment is HTTPS, so the cookie
// carries the Secure attribute outside dev. Shared by the cookie writers
// (root loader, set-lang action) so the decision lives in one place.
export const isSecureRuntime = (): boolean => process.env.DB_PORTAL_ENV !== "dev"

export const serializeLangCookie = (lang: Lang, opts: LangCookieOptions): string =>
  serialize(LANG_COOKIE_NAME, lang, {
    sameSite: "lax",
    secure: opts.secure,
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  })

export const parseLangCookie = (cookieHeader: string | null | undefined): Lang | undefined => {
  if (!cookieHeader) return undefined
  const value = parse(cookieHeader)[LANG_COOKIE_NAME]
  return isLang(value) ? value : undefined
}
