import { useFetcher, useMatches } from "react-router"

import { useLang, useT } from "~/lib/i18n"
import { Button, InfoIcon } from "~/ui"

type I18nState = "complete" | "missing" | "partial"

type I18nHandle = { i18n: { en?: I18nState } }

type LoaderTranslationState = { translationState?: I18nState }

const isI18nHandle = (h: unknown): h is I18nHandle =>
  !!h && typeof h === "object" && "i18n" in h && typeof (h as I18nHandle).i18n === "object"

const stateFromLoaderData = (data: unknown): I18nState | undefined => {
  if (data === null || typeof data !== "object") return undefined
  if (!("translationState" in data)) return undefined
  const state = (data as LoaderTranslationState).translationState

  return state === "complete" || state === "missing" || state === "partial" ? state : undefined
}

// route の handle または loader data のいずれかが「complete でない」 と主張すれば missing。
// 静的な route 全体の状態は handle、 request-time で決まる page-content のような
// 動的 route は loader data 経由で translationState を渡す。
const isMissing = (match: { handle: unknown; data: unknown }): boolean => {
  if (isI18nHandle(match.handle)) {
    const state = match.handle.i18n.en
    if (state !== undefined && state !== "complete") return true
  }
  const loaderState = stateFromLoaderData(match.data)
  if (loaderState !== undefined && loaderState !== "complete") return true

  return false
}

export const TranslationUnavailable = () => {
  const lang = useLang()
  const matches = useMatches()
  const t = useT()
  const fetcher = useFetcher()

  if (lang !== "en") return null
  const missing = matches.some((m) => isMissing(m))
  if (!missing) return null

  return (
    <section
      role="status"
      aria-live="polite"
      data-testid="translation-unavailable"
      className="px-2 py-2"
    >
      <article className="bg-surface-subtle border border-border-soft rounded-button max-w-content-max mx-auto w-full px-4 py-2 flex items-center gap-3 text-fs-body-sm">
        <InfoIcon size={16} />
        <span className="text-ink font-semibold whitespace-nowrap">
          {t("translationUnavailable.title")}
        </span>
        <span className="text-ink-mid flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
          {t("translationUnavailable.description")}
        </span>
        <fetcher.Form method="post" action="/api/set-lang" className="inline-flex">
          <input type="hidden" name="lang" value="ja" />
          <Button kind="link" type="submit">
            {t("translationUnavailable.switchToJa")}
          </Button>
        </fetcher.Form>
      </article>
    </section>
  )
}
