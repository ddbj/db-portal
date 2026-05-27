import { type NewsItem, newsItemSummary, newsItemTitle, newsItemUrl } from "~/lib/api"
import { categoryLabelKey, formatDate, type Lang, useT } from "~/lib/i18n"
import { Tag, TextLink } from "~/ui"

type NewsRowProps = {
  item: NewsItem
  lang: Lang
}

export const NewsRow = ({ item, lang }: NewsRowProps) => {
  const t = useT()
  const title = newsItemTitle(item, lang)
  const summary = newsItemSummary(item, lang)
  const externalUrl = newsItemUrl(item, lang)

  return (
    <li
      className="flex items-start gap-hero-gap border-b border-border-soft last:border-b-0"
      style={{ padding: "16px 4px" }}
    >
      <span
        className="font-mono text-fs-meta text-ink-soft shrink-0 w-news-date tracking-meta"
        style={{ paddingTop: 3 }}
      >
        {formatDate(item.publishedAt)}
      </span>
      <div className="flex-1 min-w-0">
        {externalUrl !== undefined
          ? (
            <TextLink href={externalUrl} external weight="bold">
              <span className="text-ink text-fs-body leading-title">{title}</span>
            </TextLink>
          )
          : (
            <span className="text-ink text-fs-body font-semibold leading-title">
              {title}
            </span>
          )}
        {summary !== undefined && summary !== "" && (
          <p className="text-ink-soft text-fs-meta leading-prose mt-1 m-0 line-clamp-2">
            {summary}
          </p>
        )}
      </div>
      <div
        className="flex items-start gap-1.5 flex-wrap shrink-0 max-w-right-pane justify-end"
        style={{ paddingTop: 3 }}
      >
        <Tag kind="source" name={item.source === "dbcls" ? "DBCLS" : "DDBJ"} size="sm" />
        {item.db.map((db) => (
          <Tag key={db} kind="tag" size="sm" mono>{db}</Tag>
        ))}
        <Tag kind="tag" size="sm">
          {t(categoryLabelKey(item.category))}
        </Tag>
      </div>
    </li>
  )
}
