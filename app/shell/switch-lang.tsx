import { Link, useLocation } from "react-router"

import { getCounterpartUrl, type Lang, useLang, useT } from "~/lib/i18n"
import { GlobeIcon } from "~/ui"

export const SwitchLang = () => {
  const lang = useLang()
  const { pathname } = useLocation()
  const t = useT()
  const target: Lang = lang === "ja" ? "en" : "ja"
  const key = target === "en" ? "switchLang.toEn" : "switchLang.toJa"
  const href = getCounterpartUrl(pathname, target)

  return (
    <Link
      to={href}
      hrefLang={target}
      lang={target}
      className="inline-flex items-center gap-1 text-fs-body-sm font-semibold text-ink-mid no-underline hover:underline"
    >
      <GlobeIcon size={14} title={t("a11y.languageSwitcher")} />
      {t(key)}
    </Link>
  )
}
