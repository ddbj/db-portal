import type { NewsItem } from "~/lib/api"
import { useT } from "~/lib/i18n"
import type { Lang } from "~/lib/i18n/use-lang"
import { NativeSelect, Pagination } from "~/ui"

import {
  type NewsFacetState,
  setPage,
  setSort,
} from "./facet-url-state"
import { NewsRow } from "./news-row"

export type NewsListProps = {
  lang: Lang
  facet: NewsFacetState
  onChange: (next: NewsFacetState) => void
  loading: boolean
  error: boolean
  total: number
  visibleItems: readonly NewsItem[]
  totalPages: number
  pageSize?: number
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
  pageSize = 10,
}: NewsListProps) => {
  const t = useT()
  const rangeStart = total === 0 ? 0 : (facet.page - 1) * pageSize + 1
  const rangeEnd = Math.min(facet.page * pageSize, total)
  const showFooter = total > 0

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      <header
        className="flex items-center justify-between gap-4 border-b border-border-soft"
        style={{ padding: "10px 0" }}
      >
        <p className="text-fs-meta text-ink-soft m-0">
          {t("news.toolbar.count", { count: total })}
        </p>
        <label className="flex items-center gap-2 text-fs-meta text-ink-soft">
          <span>{t("news.toolbar.sort")}</span>
          <NativeSelect
            ariaLabel={t("news.toolbar.sort")}
            value={facet.sort}
            onChange={(event) =>
              onChange(setSort(facet, event.currentTarget.value as NewsFacetState["sort"]))}
            options={[
              { value: "newest", label: t("news.toolbar.sortNewest") },
              { value: "oldest", label: t("news.toolbar.sortOldest") },
            ]}
          />
        </label>
      </header>
      {loading && (
        <p className="text-ink-soft text-fs-body py-4" role="status">
          {t("common.loading")}
        </p>
      )}
      {!loading && error && (
        <p className="text-fail text-fs-body py-4" role="alert">
          {t("news.list.error")}
        </p>
      )}
      {!loading && !error && visibleItems.length === 0 && (
        <p className="text-ink-soft text-fs-body py-4">{t("news.list.empty")}</p>
      )}
      {visibleItems.length > 0 && (
        <ul className="list-none p-0 m-0">
          {visibleItems.map((item) => (
            <NewsRow key={item.id} item={item} lang={lang} />
          ))}
        </ul>
      )}
      {showFooter && (
        <footer
          className="flex items-center justify-between gap-4 border-t border-border-soft"
          style={{ padding: "16px 0" }}
        >
          <p className="text-fs-meta text-ink-soft m-0 font-mono">
            {`${rangeStart}–${rangeEnd} / ${total.toLocaleString()} ${t("common.countSuffix")}`}
          </p>
          {totalPages > 1 && (
            <Pagination
              page={facet.page}
              totalPages={totalPages}
              onPageChange={(page) => onChange(setPage(facet, page))}
              ariaLabel={t("a11y.paginationNav")}
              prevLabel={t("a11y.paginationPrev")}
              nextLabel={t("a11y.paginationNext")}
              jumpToLastLabel={(n) => t("a11y.paginationJumpToLast", { n })}
            />
          )}
        </footer>
      )}
    </div>
  )
}
