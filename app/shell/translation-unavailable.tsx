import { useLocation, useMatches } from "react-router"

import { getCounterpartUrl, useLang, useT } from "~/lib/i18n"
import { InfoIcon, TextLink } from "~/ui"

type I18nState = "complete" | "missing" | "partial"

type MatchHandle = { i18n?: { en?: I18nState } } | undefined

const isMissing = (handle: MatchHandle): boolean => {
  if (handle === undefined) return false
  const state = handle.i18n?.en
  if (state === undefined) return false
  return state !== "complete"
}

export const TranslationUnavailable = () => {
  const lang = useLang()
  const matches = useMatches()
  const { pathname } = useLocation()
  const t = useT()

  if (lang !== "en") return null
  const missing = matches.some((m) => isMissing(m.handle as MatchHandle))
  if (!missing) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-surface-subtle border-y border-border-soft"
    >
      <div className="max-w-content-max mx-auto px-page-gutter py-3 flex items-start gap-3 text-fs-body-sm">
        <InfoIcon size={16} />
        <div className="flex-1 min-w-0">
          <div className="text-ink font-semibold">
            {t("translationUnavailable.title")}
          </div>
          <p className="text-ink-mid text-fs-body-sm mt-0.5 leading-relaxed m-0">
            {t("translationUnavailable.description")}
          </p>
        </div>
        <TextLink to={getCounterpartUrl(pathname, "ja")}>
          {t("translationUnavailable.switchToJa")}
        </TextLink>
      </div>
    </div>
  )
}
