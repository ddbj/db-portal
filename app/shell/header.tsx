import { Link, useLocation } from "react-router"

import { type Lang, useLang, useT } from "~/lib/i18n"
import { cn } from "~/ui"

import { LoginButton } from "./login-button"
import { SwitchLang } from "./switch-lang"

export type NavId = "top" | "search" | "submit" | "news"

type NavItem = { id: NavId; path: "" | "search" | "submit" | "news" }

const NAV_ITEMS: readonly NavItem[] = [
  { id: "top", path: "" },
  { id: "search", path: "search" },
  { id: "submit", path: "submit" },
  { id: "news", path: "news" },
]

const buildHref = (path: NavItem["path"], lang: Lang): string => {
  const prefix = lang === "en" ? "/en" : ""
  if (path === "") return prefix === "" ? "/" : prefix
  return `${prefix}/${path}`
}

export const computeActiveNav = (pathname: string, lang: Lang): NavId | null => {
  for (const item of NAV_ITEMS) {
    const href = buildHref(item.path, lang)
    if (item.path === "") {
      if (pathname === href) return item.id
      continue
    }
    if (pathname === href || pathname.startsWith(`${href}/`)) {
      return item.id
    }
  }
  return null
}

type HeaderProps = {
  active?: NavId | null
}

export const Header = ({ active }: HeaderProps) => {
  const lang = useLang()
  const { pathname } = useLocation()
  const t = useT()
  const resolvedActive = active === undefined ? computeActiveNav(pathname, lang) : active

  return (
    <header className="border-b border-border-soft bg-surface">
      <div className="px-page-gutter py-3 flex items-center gap-6 max-w-content-max mx-auto">
        <Link
          to={buildHref("", lang)}
          className="text-[17px] font-bold text-ink no-underline tracking-tight"
        >
          {t("common.siteName")}
        </Link>
        <nav
          aria-label={t("a11y.mainNav")}
          className="ml-auto flex items-center gap-1"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = resolvedActive === item.id
            return (
              <Link
                key={item.id}
                to={buildHref(item.path, lang)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "px-3.5 py-1.5 text-[14.5px] rounded-button no-underline",
                  isActive
                    ? "text-brand font-bold"
                    : "text-ink-mid font-medium hover:text-ink",
                )}
              >
                {t(`nav.${item.id}`)}
              </Link>
            )
          })}
          <span aria-hidden className="w-px h-[18px] bg-border-soft mx-2" />
          <SwitchLang />
          <LoginButton />
        </nav>
      </div>
    </header>
  )
}
