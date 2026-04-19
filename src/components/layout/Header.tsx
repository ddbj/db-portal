import { Globe, User } from "lucide-react"
import { Link, NavLink } from "react-router"

import cn from "@/components/ui/cn"
import { NAV_ITEMS } from "@/lib/nav"

const Header = () => {

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
          aria-label="メインナビゲーション"
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
              {item.label}
            </NavLink>
          ))}
          <div className="ml-2 flex items-center gap-4 border-l border-gray-200 pl-5">
            <button
              type="button"
              className="flex items-center gap-1.5 text-sm"
              aria-label="言語切替（未実装）"
            >
              <Globe className="h-5 w-5 text-gray-500" aria-hidden="true" />
              <span className="text-gray-900">JA</span>
              <span className="text-gray-300">/</span>
              <span className="text-gray-400 hover:text-gray-700">EN</span>
            </button>
            <button
              type="button"
              className="hover:text-primary-700 flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1.5 text-sm text-gray-700 hover:border-gray-300"
              aria-label="ログイン（未実装）"
            >
              <User className="h-5 w-5" aria-hidden="true" />
              ログイン
            </button>
          </div>
        </nav>
      </div>
    </header>
  )
}

export default Header
