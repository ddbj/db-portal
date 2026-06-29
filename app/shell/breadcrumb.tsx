import { Link } from "react-router"

import {
  type BreadcrumbItem,
  type BreadcrumbOptions,
  type BreadcrumbResolver,
  useBreadcrumb,
} from "~/lib/content/breadcrumb"
import { getPageByPath } from "~/lib/content/markdown-loader"
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
  // catch-all で受ける page-contents 配下のページの breadcrumb を、URL の
  // 各 segment について順に組み立てる。中間 segment はそのセグメントを
  // urlPath とする index ページがあればそのタイトルとリンクで、なければ
  // クリック不可のラベルだけで表現する。
  const pageContentResolver: BreadcrumbResolver = ({ pathname }) => {
    const segments = pathname.split("/").filter(Boolean)
    if (segments.length === 0) return null
    const items: BreadcrumbItem[] = []
    for (let i = 0; i < segments.length; i++) {
      const subPath = `/${segments.slice(0, i + 1).join("/")}`
      const page = getPageByPath(subPath)
      const fm = page
        ? (lang === "en" && page.frontmatter.en ? page.frontmatter.en : page.frontmatter.ja)
        : undefined
      const label = fm?.title ?? segments[i] ?? ""
      items.push({ label, href: subPath })
    }

    return items
  }
  const mergedResolvers = {
    "docs-root": docsRootResolver,
    "page-content": pageContentResolver,
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
