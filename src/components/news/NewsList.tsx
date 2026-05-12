import { useTranslation } from "react-i18next"

import cn from "@/components/ui/cn"
import { useLanguage } from "@/i18n"
import type { MirroredNewsItem } from "@/server/news-mirror"

interface NewsListProps {
  items: readonly MirroredNewsItem[]
  variant?: "compact" | "default"
}

const formatDate = (isoDate: string, lang: "ja" | "en"): string => {
  const [y, m, d] = isoDate.split("-")
  if (!y || !m || !d) return isoDate

  return lang === "ja" ? `${y}/${m}/${d}` : `${y}-${m}-${d}`
}

const sourceBadgeClass = (source: MirroredNewsItem["source"]): string =>
  source === "ddbj"
    ? "bg-primary-50 text-primary-700 ring-primary-100"
    : "bg-emerald-50 text-emerald-700 ring-emerald-100"

const NewsList = ({ items, variant = "default" }: NewsListProps) => {
  const { t } = useTranslation()
  const { lang } = useLanguage()

  const sourceLabel = (source: MirroredNewsItem["source"]): string => {
    switch (source) {
      case "ddbj":
        return t("routes.news.facets.source_ddbj")
      case "dbcls":
        return t("routes.news.facets.source_dbcls")
    }
  }

  if (items.length === 0) {
    return <p className="px-1 py-6 text-sm text-gray-500">{t("routes.news.empty")}</p>
  }

  const compact = variant === "compact"

  return (
    <ul className="divide-y divide-gray-100">
      {items.map((item) => (
        <li key={item.id}>
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={
              compact
                ? "group flex flex-col gap-0.5 px-1 py-3"
                : "group flex flex-col gap-1 px-1 py-3 sm:flex-row sm:items-baseline sm:gap-4"
            }
          >
            {compact
              ? (
                <div className="flex items-center gap-2">
                  <time
                    dateTime={item.date}
                    className="shrink-0 font-mono text-xs text-gray-500 tabular-nums"
                  >
                    {formatDate(item.date, lang)}
                  </time>
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 text-[10px] ring-1 ring-inset",
                      sourceBadgeClass(item.source),
                    )}
                  >
                    {sourceLabel(item.source)}
                  </span>
                </div>
              )
              : (
                <time
                  dateTime={item.date}
                  className="shrink-0 font-mono text-xs text-gray-500 tabular-nums"
                >
                  {formatDate(item.date, lang)}
                </time>
              )}
            <span className="group-hover:text-primary-700 text-sm text-gray-800 group-hover:underline">
              {item.title}
            </span>
            {!compact && (
              <span className="flex flex-wrap gap-1 sm:ml-auto">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-xs ring-1 ring-inset",
                    sourceBadgeClass(item.source),
                  )}
                >
                  {sourceLabel(item.source)}
                </span>
                {item.db.filter((d) => d !== "top").slice(0, 3).map((d) => (
                  <span
                    key={`db-${d}`}
                    className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                  >
                    {d}
                  </span>
                ))}
              </span>
            )}
          </a>
        </li>
      ))}
    </ul>
  )
}

export default NewsList
