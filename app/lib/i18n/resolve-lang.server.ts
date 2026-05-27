import type { Lang } from "./use-lang"

export const detectLangHint = (searchParams: URLSearchParams): Lang | null => {
  const value = searchParams.get("lang")
  if (value === "ja" || value === "en") return value
  return null
}

type AcceptEntry = { tag: string; q: number }

const parseAcceptLanguage = (header: string | null): AcceptEntry[] => {
  if (!header) return []
  return header
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part): AcceptEntry | null => {
      const segments = part.split(";")
      const rawTag = segments[0]
      if (rawTag === undefined) return null
      const tag = rawTag.trim().toLowerCase()
      if (tag.length === 0) return null
      const qParam = segments.slice(1).map((p) => p.trim()).find((p) => p.startsWith("q="))
      const q = qParam ? Number(qParam.slice(2)) : 1
      if (!Number.isFinite(q) || q < 0 || q > 1) return null
      return { tag, q }
    })
    .filter((e): e is AcceptEntry => e !== null)
    .sort((a, b) => b.q - a.q)
}

const matchLang = (tag: string): Lang | null => {
  if (tag === "ja" || tag.startsWith("ja-")) return "ja"
  if (tag === "en" || tag.startsWith("en-")) return "en"
  return null
}

const pickFromAcceptLanguage = (header: string | null): Lang | null => {
  for (const entry of parseAcceptLanguage(header)) {
    const matched = matchLang(entry.tag)
    if (matched !== null) return matched
  }
  return null
}

export type ResolveLangInput = {
  cookieLang: Lang | undefined
  acceptLanguage: string | null
  defaultLang: Lang
}

export const resolveLang = ({
  cookieLang,
  acceptLanguage,
  defaultLang,
}: ResolveLangInput): Lang => {
  if (cookieLang !== undefined) return cookieLang
  return pickFromAcceptLanguage(acceptLanguage) ?? defaultLang
}
