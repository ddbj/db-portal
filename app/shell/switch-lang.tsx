import { Link, useLocation } from "react-router"

import { getCounterpartUrl, type Lang, useLang, useT } from "~/lib/i18n"
import { cn, GlobeIcon } from "~/ui"

const LangPill = ({ code, active }: { code: "JA" | "EN"; active: boolean }) => (
  <span
    className={cn(
      "text-[13.5px] leading-none",
      active ? "text-ink font-bold" : "text-ink-mid font-normal",
    )}
  >
    {code}
  </span>
)

export const SwitchLang = () => {
  const lang = useLang()
  const { pathname } = useLocation()
  const t = useT()
  const target: Lang = lang === "ja" ? "en" : "ja"
  const href = getCounterpartUrl(pathname, target)

  return (
    <Link
      to={href}
      hrefLang={target}
      lang={target}
      aria-label={t("a11y.languageSwitcher")}
      className="inline-flex items-center gap-1.5 no-underline"
    >
      <GlobeIcon size={14} className="text-ink-mid" />
      <LangPill code="JA" active={lang === "ja"} />
      <span aria-hidden className="text-ink-softer">/</span>
      <LangPill code="EN" active={lang === "en"} />
    </Link>
  )
}
