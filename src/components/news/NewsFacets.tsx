import { useTranslation } from "react-i18next"

import { Checkbox } from "@/components/ui"
import cn from "@/components/ui/cn"
import type {
  CanonicalTag,
  NewsFacets,
  NewsSource,
  NewsType,
} from "@/server/news-mirror"

interface NewsFacetsProps {
  facets: NewsFacets
  selectedYear: string | null
  selectedType: NewsType | null
  selectedSources: ReadonlySet<NewsSource>
  selectedDbs: ReadonlySet<string>
  selectedTags: ReadonlySet<CanonicalTag>
  onSelectYear: (year: string | null) => void
  onSelectType: (type: NewsType | null) => void
  onToggleSource: (source: NewsSource) => void
  onToggleDb: (db: string) => void
  onToggleTag: (tag: CanonicalTag) => void
  onClearAll: () => void
}

const NewsFacetsView = ({
  facets,
  selectedYear,
  selectedType,
  selectedSources,
  selectedDbs,
  selectedTags,
  onSelectYear,
  onSelectType,
  onToggleSource,
  onToggleDb,
  onToggleTag,
  onClearAll,
}: NewsFacetsProps) => {
  const { t } = useTranslation()

  const sourceLabel = (source: NewsSource): string => {
    switch (source) {
      case "ddbj":
        return t("routes.news.facets.source_ddbj")
      case "dbcls":
        return t("routes.news.facets.source_dbcls")
    }
  }

  const tagLabel = (tag: CanonicalTag): string => {
    switch (tag) {
      case "announcement":
        return t("routes.news.facets.tag_announcement")
      case "data-release":
        return t("routes.news.facets.tag_data-release")
      case "maintenance":
        return t("routes.news.facets.tag_maintenance")
      case "service":
        return t("routes.news.facets.tag_service")
      case "event":
        return t("routes.news.facets.tag_event")
      case "recruitment":
        return t("routes.news.facets.tag_recruitment")
      case "other":
        return t("routes.news.facets.tag_other")
    }
  }

  const hasAny
    = selectedYear !== null
      || selectedType !== null
      || selectedSources.size > 0
      || selectedDbs.size > 0
      || selectedTags.size > 0

  return (
    <aside aria-labelledby="news-facets-heading" className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 id="news-facets-heading" className="text-sm font-semibold text-gray-900">
          {t("routes.news.facets.heading")}
        </h2>
        {hasAny && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-primary-700 text-xs hover:underline"
          >
            {t("routes.news.facets.clearAll")}
          </button>
        )}
      </div>

      <section>
        <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
          {t("routes.news.facets.type")}
        </h3>
        <div className="mt-2 space-y-1">
          {facets.type.map((bucket) => {
            const isSelected = selectedType === bucket.value
            const label
              = bucket.value === "notification"
                ? t("routes.news.facets.typeNotification")
                : t("routes.news.facets.typeNews")

            return (
              <button
                key={bucket.value}
                type="button"
                onClick={() => onSelectType(isSelected ? null : (bucket.value as NewsType))}
                className={cn(
                  "flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm",
                  isSelected
                    ? "bg-primary-50 text-primary-800"
                    : "text-gray-700 hover:bg-gray-50",
                )}
              >
                <span>{label}</span>
                <span className="font-mono text-xs text-gray-500 tabular-nums">{bucket.count}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
          {t("routes.news.facets.source")}
        </h3>
        <ul className="mt-2 space-y-1">
          {facets.source.map((bucket) => (
            <li key={bucket.value} className="flex items-center justify-between gap-2">
              <Checkbox
                checked={selectedSources.has(bucket.value as NewsSource)}
                onChange={() => onToggleSource(bucket.value as NewsSource)}
                label={sourceLabel(bucket.value as NewsSource)}
              />
              <span className="font-mono text-xs text-gray-500 tabular-nums">{bucket.count}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
          {t("routes.news.facets.year")}
        </h3>
        <div className="mt-2 space-y-1">
          {facets.year.slice(0, 10).map((bucket) => {
            const isSelected = selectedYear === bucket.value

            return (
              <button
                key={bucket.value}
                type="button"
                onClick={() => onSelectYear(isSelected ? null : bucket.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm",
                  isSelected
                    ? "bg-primary-50 text-primary-800"
                    : "text-gray-700 hover:bg-gray-50",
                )}
              >
                <span className="tabular-nums">{bucket.value}</span>
                <span className="font-mono text-xs text-gray-500 tabular-nums">{bucket.count}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
          {t("routes.news.facets.db")}
        </h3>
        <ul className="mt-2 space-y-1">
          {facets.db.map((bucket) => (
            <li key={bucket.value} className="flex items-center justify-between gap-2">
              <Checkbox
                checked={selectedDbs.has(bucket.value)}
                onChange={() => onToggleDb(bucket.value)}
                label={bucket.value}
              />
              <span className="font-mono text-xs text-gray-500 tabular-nums">{bucket.count}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
          {t("routes.news.facets.tag")}
        </h3>
        <ul className="mt-2 space-y-1">
          {facets.tag.map((bucket) => (
            <li key={bucket.value} className="flex items-center justify-between gap-2">
              <Checkbox
                checked={selectedTags.has(bucket.value as CanonicalTag)}
                onChange={() => onToggleTag(bucket.value as CanonicalTag)}
                label={tagLabel(bucket.value as CanonicalTag)}
              />
              <span className="font-mono text-xs text-gray-500 tabular-nums">{bucket.count}</span>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  )
}

export default NewsFacetsView
