import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import { en } from "./resources/en"
import { ja } from "./resources/ja"

let initialized = false

export const initI18n = (lng: "ja" | "en"): typeof i18n => {
  if (!initialized) {
    i18n.use(initReactI18next).init({
      resources: {
        ja: { translation: ja },
        en: { translation: en },
      },
      lng,
      fallbackLng: "ja",
      interpolation: { escapeValue: false },
    })
    initialized = true
  } else if (i18n.language !== lng) {
    void i18n.changeLanguage(lng)
  }

  return i18n
}

export { i18n }
