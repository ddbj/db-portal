import { useContext } from "react"

import { LangContext } from "./lang-context"

export type Lang = "ja" | "en"

export const useLang = (): Lang => {
  const lang = useContext(LangContext)
  if (lang === null) {
    throw new Error("useLang must be used within a LangProvider")
  }
  return lang
}
