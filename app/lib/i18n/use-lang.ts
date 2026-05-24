import { useMatches } from "react-router"

export type Lang = "ja" | "en"

type LangMatch = { handle: unknown }

const hasEnHandle = (m: LangMatch): boolean =>
  !!m.handle
  && typeof m.handle === "object"
  && (m.handle as { lang?: Lang }).lang === "en"

export const determineLang = (matches: readonly LangMatch[]): Lang =>
  matches.some(hasEnHandle) ? "en" : "ja"

export const useLang = (): Lang => determineLang(useMatches())
