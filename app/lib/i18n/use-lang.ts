import { useLocation, useMatches } from "react-router"

export type Lang = "ja" | "en"

type LangMatch = { handle: unknown }

const isEnPathname = (pathname: string): boolean =>
  pathname === "/en" || pathname.startsWith("/en/")

export const determineLang = (
  matches: readonly LangMatch[],
  pathname?: string,
): Lang => {
  const hasEnHandle = matches.some((m) =>
    !!m.handle
    && typeof m.handle === "object"
    && (m.handle as { lang?: Lang }).lang === "en",
  )
  if (hasEnHandle) return "en"
  if (pathname && isEnPathname(pathname)) return "en"

  return "ja"
}

export const useLang = (): Lang =>
  determineLang(useMatches(), useLocation().pathname)
