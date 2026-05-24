import { Link } from "react-router"

import {
  type BreadcrumbItem,
  type BreadcrumbOptions,
  type BreadcrumbResolver,
  useBreadcrumb,
} from "~/lib/content/breadcrumb"
import { getDatabaseBySlug } from "~/lib/content/loader"
import { type Lang, useLang, useT } from "~/lib/i18n"

type BreadcrumbProps = {
  resolvers?: BreadcrumbOptions["resolvers"]
}

const homeHrefFor = (lang: Lang): string => (lang === "en" ? "/en" : "/")

export const Breadcrumb = ({ resolvers }: BreadcrumbProps = {}) => {
  const lang = useLang()
  const t = useT()
  const databaseResolver: BreadcrumbResolver = ({ params, pathname }) => {
    const slug = params.slug
    if (slug === undefined) return null
    const db = getDatabaseBySlug(slug)
    if (db === undefined) return null

    return { label: db.title[lang], href: pathname }
  }
  const mergedResolvers = { "database-content": databaseResolver, ...(resolvers ?? {}) }
  const raw = useBreadcrumb({ resolvers: mergedResolvers })
  if (raw.length === 0) return null

  const items: BreadcrumbItem[] = [
    { label: t("breadcrumb.home"), href: homeHrefFor(lang) },
    ...raw,
  ]

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
