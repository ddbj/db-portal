import { Link } from "react-router"

import {
  type BreadcrumbItem,
  type BreadcrumbOptions,
  type BreadcrumbResolver,
  useBreadcrumb,
} from "~/lib/content/breadcrumb"
import { getPageBySlug } from "~/lib/content/markdown-loader"
import { useLang, useT } from "~/lib/i18n"

type BreadcrumbProps = {
  resolvers?: BreadcrumbOptions["resolvers"]
}

export const Breadcrumb = ({ resolvers }: BreadcrumbProps = {}) => {
  const lang = useLang()
  const t = useT()
  const docsRootResolver: BreadcrumbResolver = () => ({
    label: t("breadcrumb.docs"),
    href: "/docs",
  })
  const databaseResolver: BreadcrumbResolver = ({ params, pathname }) => {
    const slug = params.slug
    if (slug === undefined) return null
    const page = getPageBySlug("databases", slug)
    if (page === undefined) return null
    const fm = lang === "en" && page.frontmatter.en
      ? page.frontmatter.en
      : page.frontmatter.ja

    return { label: fm.title, href: pathname }
  }
  const mergedResolvers = {
    "docs-root": docsRootResolver,
    "database-content": databaseResolver,
    ...(resolvers ?? {}),
  }
  const raw = useBreadcrumb({ resolvers: mergedResolvers })
  if (raw.length === 0) return null

  const items: BreadcrumbItem[] = [
    { label: t("breadcrumb.home"), href: "/" },
    ...raw,
  ]

  if (items.length <= 1) return null

  return (
    <nav
      aria-label={t("a11y.breadcrumbNav")}
      className="max-w-content-max mx-auto px-page-gutter py-2"
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
