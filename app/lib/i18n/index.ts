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

export { categoryLabelKey } from "./category-label"
export { flattenKeys } from "./flatten-keys"
export { formatDate, formatDateLocalized } from "./format-date"
export { LangProvider } from "./lang-context"
export { usePaginationLabels } from "./pagination-labels"
export { en } from "./resources/en"
export { ja } from "./resources/ja"
export {
  serviceCategoryLabelKey,
} from "./service-category-label"
export { type Lang, useLang } from "./use-lang"
export { useT } from "./use-t"
