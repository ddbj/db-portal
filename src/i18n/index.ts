export { default } from "./config"
export type { Lang } from "./cookie"
export {
  parseLangCookie,
  pickLang,
  pickLangFromAcceptLanguage,
  SUPPORTED_LANGS,
} from "./cookie"
export { useLanguage } from "./useLanguage"
