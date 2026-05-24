import { useQuery } from "@tanstack/react-query"

import { fetchNews } from "~/lib/api/news"
import { type Lang, useLang, useT } from "~/lib/i18n"
import { SectionHeading, Tag, TextLink } from "~/ui"

const NEWS_LIMIT = 8

const newsHref = (id: string, lang: Lang): string =>
  lang === "en" ? `/en/news#${id}` : `/news#${id}`

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}/${m}/${day}`
}

export const NewsAside = () => {
  const t = useT()
  const lang = useLang()
  const newsListHref = lang === "en" ? "/en/news" : "/news"

  const query = useQuery({
    queryKey: ["news"],
    queryFn: () => fetchNews(),
    staleTime: 5 * 60_000,
  })

  const items = (query.data ?? []).slice(0, NEWS_LIMIT)

  return (
    <aside className="w-right-pane sticky top-4 text-fs-body-sm">
      <SectionHeading
        as="h2"
        action={
          <TextLink to={newsListHref}>
            {t("newsAside.viewAll")} →
          </TextLink>
        }
      >
        {t("newsAside.heading")}
      </SectionHeading>
      {query.isLoading && (
        <p className="text-ink-soft text-fs-body-sm" role="status">
          {t("common.loading")}
        </p>
      )}
      {!query.isLoading && items.length === 0 && (
        <p className="text-ink-soft text-fs-body-sm">{t("newsAside.empty")}</p>
      )}
      <ul className="list-none p-0 m-0 flex flex-col gap-3">
        {items.map((n) => (
          <li key={n.id} className="border-b border-border-soft pb-3 last:border-b-0">
            <div className="flex items-center gap-2 mb-1 text-fs-label">
              <span className="font-mono text-ink-soft">{formatDate(n.publishedAt)}</span>
              <Tag kind="source" name="DDBJ" size="sm" />
              <Tag kind="tag" size="sm">{n.category}</Tag>
            </div>
            <TextLink to={newsHref(n.id, lang)} weight="bold">
              <span className="text-ink line-clamp-1">
                {n.title[lang] || n.title.ja}
              </span>
            </TextLink>
          </li>
        ))}
      </ul>
    </aside>
  )
}
