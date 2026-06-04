import { Link, Outlet, useLocation } from "react-router"

import { cn } from "~/ui"

const NAV_ITEMS = [
  { to: "/_design", label: "Overview" },
  { to: "/_design/tokens", label: "Tokens" },
  { to: "/_design/primitives", label: "Primitives" },
  { to: "/_design/submit-result-summary", label: "Result summary" },
] as const

const DesignLayout = () => {
  const { pathname } = useLocation()

  return (
    <div className="max-w-content-max mx-auto px-page-gutter py-section-md">
      <nav className="flex gap-3 mb-section-md text-fs-body" aria-label="Design preview navigation">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.to
            || (item.to !== "/_design" && pathname.startsWith(`${item.to}/`))
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "px-3 py-1.5 rounded-button no-underline border",
                active
                  ? "border-brand text-brand font-bold"
                  : "border-border-soft text-ink-mid font-medium",
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
      <Outlet />
    </div>
  )
}

export default DesignLayout
