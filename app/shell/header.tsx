import { Link, useLocation } from "react-router"

import { useT } from "~/lib/i18n"
import { cn, ExternalIcon } from "~/ui"

import { LoginButton } from "./login-button"
import { SwitchLang } from "./switch-lang"

type NavId = "search" | "submit" | "about"

type InternalNavItem = { id: "search" | "submit"; kind: "internal"; path: "search" | "submit" }
type ExternalNavItem = { id: "about"; kind: "external"; href: string }
type NavItem = InternalNavItem | ExternalNavItem

const NAV_ITEMS: readonly NavItem[] = [
  { id: "search", kind: "internal", path: "search" },
  { id: "submit", kind: "internal", path: "submit" },
  { id: "about", kind: "external", href: "https://bsi.rois.ac.jp" },
]

export const computeActiveNav = (pathname: string): NavId | null => {
  for (const item of NAV_ITEMS) {
    if (item.kind !== "internal") continue
    const href = `/${item.path}`
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
  const { pathname } = useLocation()
  const t = useT()
  const resolvedActive = active === undefined ? computeActiveNav(pathname) : active

  return (
    <header className="bg-surface">
      <div className="px-12 py-4 flex items-center gap-6">
        <Link to="/" className="no-underline shrink-0">
          <img
            src="/bsi-logo.svg"
            alt="BioData Science Initiative"
            className="block h-[34px] w-auto"
          />
        </Link>
        <nav
          aria-label={t("a11y.mainNav")}
          className="ml-auto flex items-center gap-1"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = item.kind === "internal" && resolvedActive === item.id
            const className = cn(
              "px-3 py-1 text-fs-body rounded-button no-underline inline-flex items-center gap-1.5",
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
                to={`/${item.path}`}
                aria-current={isActive ? "page" : undefined}
                className={className}
              >
                {t(`nav.${item.id}`)}
              </Link>
            )
          })}
          <SwitchLang />
          <span aria-hidden className="w-px h-4 bg-border-soft mx-2" />
          <LoginButton />
        </nav>
      </div>
    </header>
  )
}
