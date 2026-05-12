const SUPPORTED = ["ja", "en"] as const
export type Lang = typeof SUPPORTED[number]
export { SUPPORTED as SUPPORTED_LANGS }

const isLang = (value: string): value is Lang =>
  (SUPPORTED as readonly string[]).includes(value)

export const parseLangCookie = (cookieHeader: string | null): Lang | null => {
  if (!cookieHeader) return null
  const parts = cookieHeader.split(";")
  for (const part of parts) {
    const eq = part.indexOf("=")
    if (eq === -1) continue
    const name = part.slice(0, eq).trim()
    if (name !== "lang") continue
    const value = part.slice(eq + 1).trim()
    if (isLang(value)) return value

    return null
  }

  return null
}

export const pickLangFromAcceptLanguage = (acceptLang: string | null): Lang => {
  if (!acceptLang) return "en"
  const lower = acceptLang.toLowerCase()
  for (const item of lower.split(",")) {
    const tag = item.split(";")[0]?.trim() ?? ""
    if (tag === "ja" || tag.startsWith("ja-")) return "ja"
    if (tag === "en" || tag.startsWith("en-")) return "en"
  }

  return "en"
}

export const pickLang = (
  cookieHeader: string | null,
  acceptLang: string | null,
): Lang => parseLangCookie(cookieHeader) ?? pickLangFromAcceptLanguage(acceptLang)

const LANG_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365

export const writeLangCookie = (lang: Lang): void => {
  if (typeof document === "undefined") return
  const secure = window.location.protocol === "https:" ? "; Secure" : ""
  document.cookie =
    `lang=${lang}; Path=/; Max-Age=${LANG_COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure}`
}
