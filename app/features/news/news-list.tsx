import type { NewsItem } from "~/lib/api"
import { usePaginationLabels, useT } from "~/lib/i18n"
import type { Lang } from "~/lib/i18n/use-lang"
import { AlertIcon, ResultsPagination, SearchIcon, Select } from "~/ui"

import {
  type NewsFacetState,
  setPage,
  setSort,
} from "./facet-url-state"
import { NewsRow } from "./news-row"
import { NEWS_PAGE_SIZE } from "./use-news-list"

type NewsListProps = {
  lang: Lang
  facet: NewsFacetState
  onChange: (next: NewsFacetState) => void
  loading: boolean
  error: boolean
  total: number
  visibleItems: readonly NewsItem[]
  totalPages: number
}

export const NewsList = ({
  lang,
  facet,
  onChange,
  loading,
  error,
  total,
  visibleItems,
  totalPages,
}: NewsListProps) => {
  const t = useT()
  const paginationLabels = usePaginationLabels()
  const rangeStart = total === 0 ? 0 : (facet.page - 1) * NEWS_PAGE_SIZE + 1
  const rangeEnd = Math.min(facet.page * NEWS_PAGE_SIZE, total)

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-border-soft py-2.5 min-h-heading-row">
        <p
          className="text-fs-meta text-ink-soft m-0 font-mono"
          aria-live="polite"
          aria-atomic="true"
        >
          {total === 0
            ? t("news.toolbar.count", { count: 0 })
            : `${rangeStart}–${rangeEnd} / ${total.toLocaleString()} ${t("common.countSuffix")}`}
        </p>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-fs-meta text-ink-soft">
            <span>{t("news.toolbar.sort")}</span>
            <Select
              ariaLabel={t("news.toolbar.sort")}
              value={facet.sort}
              onChange={(next) => onChange(setSort(facet, next as NewsFacetState["sort"]))}
              options={[
                { value: "newest", label: t("news.toolbar.sortNewest") },
                { value: "oldest", label: t("news.toolbar.sortOldest") },
              ]}
            />
          </label>
          <ResultsPagination
            page={facet.page}
            totalPages={totalPages}
            onPageChange={(page) => onChange(setPage(facet, page))}
            {...paginationLabels}
          />
        </div>
      </header>
      {loading && (
        <p className="text-ink-soft text-fs-body py-4" role="status">
          {t("common.loading")}
        </p>
      )}
      {!loading && error && (
        <p className="text-red text-fs-body py-4 flex items-center gap-2" role="alert">
          <AlertIcon size={16} aria-hidden className="shrink-0" />
          {t("news.list.error")}
        </p>
      )}
      {!loading && !error && visibleItems.length === 0 && (
        <p className="text-ink-soft text-fs-body py-4 flex items-center gap-2">
          <SearchIcon size={16} aria-hidden className="text-ink-softer shrink-0" />
          {t("news.list.empty")}
        </p>
      )}
      {visibleItems.length > 0 && (
        <ul className="list-none p-0 m-0">
          {visibleItems.map((item) => (
            <NewsRow key={item.id} item={item} lang={lang} />
          ))}
        </ul>
      )}
      {totalPages > 1 && (
        <footer className="flex justify-end border-t border-border-soft py-4">
          <ResultsPagination
            page={facet.page}
            totalPages={totalPages}
            onPageChange={(page) => onChange(setPage(facet, page))}
            {...paginationLabels}
          />
        </footer>
      )}
    </div>
  )
}
