import { useFetcher } from "react-router"

import { type Lang, useLang, useT } from "~/lib/i18n"
import { cn, GlobeIcon } from "~/ui"

const LangPill = ({ code, active }: { code: "JA" | "EN"; active: boolean }) => (
  <span
    className={cn(
      "text-fs-body-sm leading-none",
      active ? "text-ink font-bold" : "text-ink-mid font-normal",
    )}
  >
    {code}
  </span>
)

export const SwitchLang = () => {
  const lang = useLang()
  const t = useT()
  const fetcher = useFetcher()
  const target: Lang = lang === "ja" ? "en" : "ja"

  return (
    <fetcher.Form
      method="post"
      action="/api/set-lang"
      className="inline-flex"
    >
      <input type="hidden" name="lang" value={target} />
      <button
        type="submit"
        aria-label={t("a11y.languageSwitcher")}
        className="inline-flex items-center gap-1.5 bg-transparent border-0 cursor-pointer p-0"
      >
        <GlobeIcon size={18} className="text-ink-mid" />
        <LangPill code="JA" active={lang === "ja"} />
        <span aria-hidden className="text-ink-softer">/</span>
        <LangPill code="EN" active={lang === "en"} />
      </button>
    </fetcher.Form>
  )
}
