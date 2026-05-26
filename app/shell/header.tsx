import { Link, useLocation } from "react-router"

import { type Lang, useLang, useT } from "~/lib/i18n"
import { cn, ExternalIcon } from "~/ui"

import { LoginButton } from "./login-button"
import { SwitchLang } from "./switch-lang"

export type NavId = "search" | "submit" | "about"

type InternalNavItem = { id: "search" | "submit"; kind: "internal"; path: "search" | "submit" }
type ExternalNavItem = { id: "about"; kind: "external"; href: string }
type NavItem = InternalNavItem | ExternalNavItem

const NAV_ITEMS: readonly NavItem[] = [
  { id: "search", kind: "internal", path: "search" },
  { id: "submit", kind: "internal", path: "submit" },
  { id: "about", kind: "external", href: "https://bsi.rois.ac.jp" },
]

const buildHref = (path: InternalNavItem["path"], lang: Lang): string => {
  const prefix = lang === "en" ? "/en" : ""
  return `${prefix}/${path}`
}

const buildHomeHref = (lang: Lang): string => (lang === "en" ? "/en" : "/")

export const computeActiveNav = (pathname: string, lang: Lang): NavId | null => {
  for (const item of NAV_ITEMS) {
    if (item.kind !== "internal") continue
    const href = buildHref(item.path, lang)
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
      <div className="px-page-gutter py-2 flex items-center gap-6">
        <Link
          to={buildHomeHref(lang)}
          className="text-[17px] font-bold text-ink no-underline leading-tight"
          style={{ letterSpacing: "0.005em" }}
        >
          DDBJ 刷新 <span className="text-ink-soft font-semibold ml-0.5">(仮)</span>
        </Link>
        <nav
          aria-label={t("a11y.mainNav")}
          className="ml-auto flex items-center gap-1"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = item.kind === "internal" && resolvedActive === item.id
            const className = cn(
              "px-3 py-1 text-[14px] rounded-button no-underline inline-flex items-center gap-1.5",
              isActive
                ? "text-brand font-bold"
                : "text-ink-mid font-medium hover:text-ink",
            )
            if (item.kind === "external") {
              return (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {t(`nav.${item.id}`)}
                  <ExternalIcon size={12} className="text-ink-soft" />
                </a>
              )
            }
            return (
              <Link
                key={item.id}
                to={buildHref(item.path, lang)}
                aria-current={isActive ? "page" : undefined}
                className={className}
              >
                {t(`nav.${item.id}`)}
              </Link>
            )
          })}
          <SwitchLang />
          <span aria-hidden className="w-px h-[18px] bg-border-soft mx-2" />
          <LoginButton />
        </nav>
      </div>
    </header>
  )
}
