import type { Lang } from "~/lib/i18n"

export const resolveHref = (
  href: string | { ja: string; en: string },
  lang: Lang,
): string => (typeof href === "string" ? href : href[lang])
