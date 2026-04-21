import en from "@/content/locales/en.json"
import ja from "@/content/locales/ja.json"

import type { Lang } from "./cookie"

// SSR loader で meta 文字列を取り出すための pure helper。
// CSR 側は i18next (src/i18n/config.ts) が同じ JSON を resources として読む。
export const resolveMeta = (lang: Lang) => (lang === "ja" ? ja : en)
