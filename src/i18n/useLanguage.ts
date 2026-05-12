import { useTranslation } from "react-i18next"

import { type Lang, writeLangCookie } from "./cookie"

const toLang = (raw: string): Lang =>
  raw === "ja" || raw === "en" ? raw : "ja"

export const useLanguage = () => {
  const { i18n } = useTranslation()
  const lang = toLang(i18n.language)
  const setLang = (next: Lang) => {
    if (next === lang) return
    writeLangCookie(next)
    void i18n.changeLanguage(next)
  }

  return { lang, setLang }
}
