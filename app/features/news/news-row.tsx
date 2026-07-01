import { type NewsItem, newsItemSummary, newsItemTitle, newsItemUrl } from "~/lib/api"
import { categoryLabelKey, formatDate, type Lang, useT } from "~/lib/i18n"
import { NewsDate, Tag, TextLink } from "~/ui"

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
    <li className="flex items-start gap-4 py-4 px-2 border-b border-border-soft last:border-b-0">
      <NewsDate className="shrink-0 w-date-col pt-0.5">{formatDate(item.publishedAt)}</NewsDate>
      <div className="flex-1 min-w-0">
        {externalUrl !== undefined
          ? (
            <TextLink href={externalUrl} external externalSrLabel={t("a11y.externalLink")} weight="bold">
              <span className="text-ink text-fs-body leading-snug">{title}</span>
            </TextLink>
          )
          : (
            <span className="text-ink text-fs-body font-semibold leading-snug">
              {title}
            </span>
          )}
        {summary !== undefined && summary !== "" && (
          <p className="text-ink-soft text-fs-meta leading-relaxed mt-1 m-0 line-clamp-2">
            {summary}
          </p>
        )}
      </div>
      <div className="flex items-start gap-1.5 flex-wrap shrink-0 max-w-right-pane justify-end pt-0.5">
        <Tag kind="source" source={item.source} size="sm" />
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
