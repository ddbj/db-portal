import { Globe, User } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, NavLink } from "react-router"

import cn from "@/components/ui/cn"
import { useLanguage } from "@/i18n"
import { NAV_ITEMS } from "@/lib/nav"

const Header = () => {
  const { t } = useTranslation()
  const { lang, setLang } = useLanguage()

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link
          to="/"
          className="text-lg font-semibold tracking-wider text-gray-900 hover:text-gray-700"
        >
          DDBJ Portal
        </Link>
        <nav
          className="flex items-center gap-6"
          aria-label={t("aria.mainNavigation")}
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "text-sm text-gray-700 hover:text-primary-700",
                  isActive && "font-semibold text-primary-700",
                )
              }
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
          <div className="ml-2 flex items-center gap-4 border-l border-gray-200 pl-5">
            <div
              className="flex items-center gap-1.5 text-sm"
              role="group"
              aria-label={t("header.language.label")}
            >
              <Globe className="h-5 w-5 text-gray-500" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setLang("ja")}
                aria-pressed={lang === "ja"}
                className={cn(
                  "hover:text-gray-700",
                  lang === "ja" ? "text-gray-900" : "text-gray-400",
                )}
              >
                {t("header.language.ja")}
              </button>
              <span className="text-gray-300" aria-hidden="true">/</span>
              <button
                type="button"
                onClick={() => setLang("en")}
                aria-pressed={lang === "en"}
                className={cn(
                  "hover:text-gray-700",
                  lang === "en" ? "text-gray-900" : "text-gray-400",
                )}
              >
                {t("header.language.en")}
              </button>
            </div>
            <button
              type="button"
              className="hover:text-primary-700 flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1.5 text-sm text-gray-700 hover:border-gray-300"
            >
              <User className="h-5 w-5" aria-hidden="true" />
              {t("header.login")}
            </button>
          </div>
        </nav>
      </div>
    </header>
  )
}

export default Header
