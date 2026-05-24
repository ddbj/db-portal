import { useMatches } from "react-router"

export type Lang = "ja" | "en"

type LangMatch = { data: unknown }

export const determineLang = (matches: readonly LangMatch[]): Lang => {
  const en = matches.some(
    (m) => (m.data as { lang?: Lang } | undefined)?.lang === "en",
  )

  return en ? "en" : "ja"
}

export const useLang = (): Lang => determineLang(useMatches())
