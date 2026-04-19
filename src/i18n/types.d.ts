import "i18next"

import type ja from "@/content/locales/ja.json"

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation"
    resources: {
      translation: typeof ja
    }
  }
}
