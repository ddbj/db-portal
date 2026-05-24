import { Link } from "react-router"

import { type BreadcrumbOptions, useBreadcrumb } from "~/lib/content/breadcrumb"
import { useT } from "~/lib/i18n"

type BreadcrumbProps = {
  resolvers?: BreadcrumbOptions["resolvers"]
}

export const Breadcrumb = ({ resolvers }: BreadcrumbProps) => {
  const t = useT()
  const items = useBreadcrumb(resolvers === undefined ? {} : { resolvers })

  if (items.length <= 1) return null

  return (
    <nav
      aria-label={t("a11y.breadcrumbNav")}
      className="max-w-content-max mx-auto px-page-gutter py-3"
    >
      <ol className="flex items-center gap-1.5 list-none p-0 m-0 text-fs-body-sm flex-wrap">
        {items.map((item, i) => {
          const isLast = i === items.length - 1
          return (
            <li key={`${i}-${item.href}`} className="inline-flex items-center gap-1.5">
              {i > 0 && (
                <span aria-hidden className="text-ink-soft">›</span>
              )}
              {isLast
                ? (
                  <span aria-current="page" className="text-ink font-semibold">
                    {item.label}
                  </span>
                )
                : (
                  <Link
                    to={item.href}
                    className="text-ink-mid no-underline hover:underline"
                  >
                    {item.label}
                  </Link>
                )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
