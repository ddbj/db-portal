import { type NewsItem, newsItemTitle, newsItemUrl } from "~/lib/api"
import { formatDate, type Lang, useT } from "~/lib/i18n"
import { Tag, TextLink } from "~/ui"

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
  const externalUrl = newsItemUrl(item, lang)
  const isAnnouncement = item.category === "announcement"

  return (
    <li className="flex items-start gap-4 py-3 border-b border-border-soft last:border-b-0">
      <span className="font-mono text-fs-label text-ink-soft shrink-0 w-news-date">
        {formatDate(item.publishedAt)}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {isAnnouncement && (
            <Tag kind="status" tone="critical" size="sm">
              {t("notificationBar.important")}
            </Tag>
          )}
          {externalUrl !== undefined
            ? (
              <TextLink href={externalUrl} external weight="bold">
                <span className="text-ink line-clamp-2">{title}</span>
              </TextLink>
            )
            : (
              <span className="text-ink font-semibold line-clamp-2">{title}</span>
            )}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-wrap shrink-0 max-w-right-pane">
        <Tag kind="source" name={item.source === "dbcls" ? "DBCLS" : "DDBJ"} size="sm" />
        {item.db.map((db) => (
          <Tag key={db} kind="tag" size="sm">{db}</Tag>
        ))}
        {!isAnnouncement && (
          <Tag kind="brand" size="sm">
            {t(categoryLabelKey(item.category))}
          </Tag>
        )}
      </div>
    </li>
  )
}
