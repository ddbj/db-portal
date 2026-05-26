import { type NewsItem, newsItemSummary, newsItemTitle, newsItemUrl } from "~/lib/api"
import { formatDate, type Lang, useT } from "~/lib/i18n"
import { cn, Tag, TextLink } from "~/ui"

type CategoryLabelKey =
  | "news.category.announcement"
  | "news.category.release"
  | "news.category.maintenance"
  | "news.category.event"
  | "news.category.news"

const categoryLabelKey = (category: NewsItem["category"]): CategoryLabelKey =>
  `news.category.${category}` as CategoryLabelKey

type NewsRowProps = {
  item: NewsItem
  lang: Lang
}

export const NewsRow = ({ item, lang }: NewsRowProps) => {
  const t = useT()
  const title = newsItemTitle(item, lang)
  const summary = newsItemSummary(item, lang)
  const externalUrl = newsItemUrl(item, lang)
  const isAnnouncement = item.category === "announcement"

  const importantBadge = (
    <span className="mr-2 inline-block" style={{ verticalAlign: 2 }}>
      <Tag kind="status" tone="critical" size="md">
        {t("notificationBar.important")}
      </Tag>
    </span>
  )

  return (
    <li
      className={cn(
        "flex items-start gap-hero-gap border-b border-border-soft last:border-b-0",
        isAnnouncement ? "border-l border-l-brand pl-3" : "",
      )}
      style={{
        borderLeftWidth: isAnnouncement ? 3 : undefined,
        padding: isAnnouncement ? "16px 4px 16px 12px" : "16px 4px",
      }}
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
              <span className="text-ink text-fs-body leading-title">
                {isAnnouncement && importantBadge}
                {title}
              </span>
            </TextLink>
          )
          : (
            <span className="text-ink text-fs-body font-semibold leading-title">
              {isAnnouncement && importantBadge}
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
