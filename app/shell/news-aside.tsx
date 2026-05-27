import { useQuery } from "@tanstack/react-query"
import { useId } from "react"

import { fetchNews, newsItemSummary, newsItemTitle } from "~/lib/api/news"
import { categoryLabelKey, formatDate, type Lang, useLang, useT } from "~/lib/i18n"
import { SectionHeading, Tag, TextLink } from "~/ui"

const NEWS_LIMIT = 5

const newsHref = (id: string, lang: Lang): string =>
  lang === "en" ? `/en/news#${id}` : `/news#${id}`

export const NewsAside = () => {
  const t = useT()
  const lang = useLang()
  const newsListHref = lang === "en" ? "/en/news" : "/news"
  const headingId = useId()

  const query = useQuery({
    queryKey: ["news"],
    queryFn: () => fetchNews(),
    staleTime: 5 * 60_000,
  })

  const items = (query.data ?? []).slice(0, NEWS_LIMIT)

  return (
    <aside aria-labelledby={headingId} className="w-full">
      <SectionHeading
        as="h2"
        id={headingId}
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
      <ul className="list-none p-0 m-0">
        {items.map((n, i) => {
          const isLast = i === items.length - 1
          const summary = newsItemSummary(n, lang)

          return (
            <li
              key={n.id}
              className={isLast ? "py-3" : "py-3 border-b border-border-soft"}
            >
              <div className="flex items-center gap-1.5 mb-[5px] flex-wrap">
                <span className="font-mono text-[12px] text-ink-soft">
                  {formatDate(n.publishedAt)}
                </span>
                <Tag kind="source" name={n.source === "dbcls" ? "DBCLS" : "DDBJ"} size="sm" />
                <Tag kind="tag" size="sm">{t(categoryLabelKey(n.category))}</Tag>
              </div>
              <TextLink to={newsHref(n.id, lang)} weight="bold">
                <span className="text-ink text-[14px] leading-[1.45]">
                  {newsItemTitle(n, lang)}
                </span>
              </TextLink>
              {summary !== undefined && summary !== "" && (
                <p className="text-ink-soft text-[12.5px] leading-[1.55] mt-[3px] m-0 line-clamp-1">
                  {summary}
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
