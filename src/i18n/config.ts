import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"

import en from "@/content/locales/en.json"
import ja from "@/content/locales/ja.json"

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "ja",
    supportedLngs: ["ja", "en"],
    detection: {
      order: ["cookie", "navigator"],
      lookupCookie: "lang",
      caches: ["cookie"],
      cookieMinutes: 60 * 24 * 365,
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        secure: import.meta.env.PROD,
      },
    },
    resources: {
      ja: { translation: ja },
      en: { translation: en },
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })

export default i18n
