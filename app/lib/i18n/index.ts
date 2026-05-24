import { createInstance, type i18n as I18nInstance } from "i18next"
import { initReactI18next } from "react-i18next"

import { en } from "./resources/en"
import { ja } from "./resources/ja"
import type { Lang } from "./use-lang"

export const createI18nInstance = (lng: Lang): I18nInstance => {
  const instance = createInstance()
  instance.use(initReactI18next).init({
    resources: {
      ja: { translation: ja },
      en: { translation: en },
    },
    lng,
    fallbackLng: "ja",
    interpolation: { escapeValue: false },
  })
  return instance
}

export { flattenKeys } from "./flatten-keys"
export { en } from "./resources/en"
export { ja, type Resources } from "./resources/ja"
export { getCounterpartUrl } from "./url"
export { determineLang, type Lang, useLang } from "./use-lang"
export { type TFn, useT } from "./use-t"
