import { useMatches } from "react-router"

export type Lang = "ja" | "en"

export const useLang = (): Lang => {
  const matches = useMatches()
  const en = matches.some(
    (m) => (m.data as { lang?: Lang } | undefined)?.lang === "en",
  )

  return en ? "en" : "ja"
}
