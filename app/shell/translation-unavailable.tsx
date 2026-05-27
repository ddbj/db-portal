import { useFetcher, useMatches } from "react-router"

import { useLang, useT } from "~/lib/i18n"
import { InfoIcon } from "~/ui"

type I18nState = "complete" | "missing" | "partial"

type I18nHandle = { i18n: { en?: I18nState } }

const isI18nHandle = (h: unknown): h is I18nHandle =>
  !!h && typeof h === "object" && "i18n" in h && typeof (h as I18nHandle).i18n === "object"

const isMissing = (handle: unknown): boolean => {
  if (!isI18nHandle(handle)) return false
  const state = handle.i18n.en
  if (state === undefined) return false

  return state !== "complete"
}

export const TranslationUnavailable = () => {
  const lang = useLang()
  const matches = useMatches()
  const t = useT()
  const fetcher = useFetcher()

  if (lang !== "en") return null
  const missing = matches.some((m) => isMissing(m.handle))
  if (!missing) return null

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="translation-unavailable"
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
        <fetcher.Form method="post" action="/api/set-lang" className="inline-flex">
          <input type="hidden" name="lang" value="ja" />
          <button
            type="submit"
            className="text-link underline underline-offset-2 bg-transparent border-0 p-0 cursor-pointer text-fs-body-sm"
          >
            {t("translationUnavailable.switchToJa")}
          </button>
        </fetcher.Form>
      </div>
    </div>
  )
}
