import type { DbSearchResponse } from "~/lib/api"
import { type Lang, usePaginationLabels, useT } from "~/lib/i18n"
import {
  type DbSlug,
  PER_PAGE_VALUES,
  type PerPageValue,
  reachablePageCount,
  SEARCH_HARD_LIMIT,
  SORT_KEYS,
  type SortKey,
} from "~/lib/search-scope"
import { AlertIcon, ResultsPagination, SearchIcon, Select, type SelectOption } from "~/ui"

import {
  DEFAULT_PAGE,
  DEFAULT_PER_PAGE,
  DEFAULT_SORT,
} from "../url/url-params"
import { ResultRow } from "./result-row"

type PerDbResultsProps = {
  db: DbSlug
  response: DbSearchResponse
  lang: Lang
  page?: number
  perPage?: PerPageValue
  sort?: SortKey
  onPageChange: (page: number) => void
  onPerPageChange: (perPage: PerPageValue) => void
  onSortChange: (sort: SortKey) => void
}

const computeRange = (
  total: number,
  page: number,
  perPage: number,
): { start: number; end: number } => {
  if (total === 0) return { start: 0, end: 0 }
  const start = (page - 1) * perPage + 1
  const end = Math.min(total, page * perPage)

  return { start, end }
}

export const PerDbResults = ({
  db,
  response,
  lang,
  page = DEFAULT_PAGE,
  perPage = DEFAULT_PER_PAGE,
  sort = DEFAULT_SORT,
  onPageChange,
  onPerPageChange,
  onSortChange,
}: PerDbResultsProps) => {
  const t = useT()
  const paginationLabels = usePaginationLabels()
  // Cap pages at the deep paging limit so pagination never offers a page the
  // search API would reject with a 400 (docs/search.md § Pagination).
  const totalPages = reachablePageCount(response.total, perPage)
  const { start, end } = computeRange(response.total, page, perPage)

  const sortOptions: SelectOption[] = SORT_KEYS.map((key) => {
    const labelKey = key === "relevance"
      ? "search.results.sort.relevance"
      : key === "date_desc" ? "search.results.sort.dateDesc" : "search.results.sort.dateAsc"

    return { value: key, label: t(labelKey) }
  })
  const perPageOptions: SelectOption[] = PER_PAGE_VALUES.map((value) => ({
    value: String(value),
    label: String(value),
  }))

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 border-b border-border-soft py-2.5 min-h-heading-row">
        <p
          className="text-fs-body-sm text-ink-mid m-0"
          aria-live="polite"
          aria-atomic="true"
        >
          {response.total === 0
            ? t("search.results.perDb.totalCount", {
              total: response.total.toLocaleString("en-US"),
            })
            : t("search.results.perDb.rangeSummary", {
              start: start.toLocaleString("en-US"),
              end: end.toLocaleString("en-US"),
              total: response.total.toLocaleString("en-US"),
            })}
        </p>
        {response.hardLimitReached && (
          <span
            role="status"
            className="inline-flex items-center gap-1 rounded-pill border border-warn-border bg-warn-bg px-2.5 py-0.5 text-fs-label font-semibold text-warn-fg"
          >
            <AlertIcon size={13} aria-hidden />
            {t("search.results.perDb.hardLimit", {
              limit: SEARCH_HARD_LIMIT.toLocaleString("en-US"),
            })}
          </span>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <label className="text-fs-label text-ink-mid inline-flex items-center gap-2">
            <span>{t("search.results.sort.label")}</span>
            <Select
              ariaLabel={t("search.results.sort.label")}
              options={sortOptions}
              value={sort}
              onChange={(next) => onSortChange(next as SortKey)}
              width={148}
            />
          </label>
          <label className="text-fs-label text-ink-mid inline-flex items-center gap-2">
            <span>{t("search.results.perPage.label")}</span>
            <Select
              ariaLabel={t("search.results.perPage.label")}
              options={perPageOptions}
              value={String(perPage)}
              onChange={(next) => {
                const parsed = Number.parseInt(next, 10)
                if (PER_PAGE_VALUES.includes(parsed as PerPageValue)) {
                  onPerPageChange(parsed as PerPageValue)
                }
              }}
              width={80}
            />
          </label>
          <ResultsPagination
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            {...paginationLabels}
          />
        </div>
      </div>
      {response.total === 0
        ? (
          <div
            role="status"
            className="flex items-center gap-3 rounded-card border border-border-soft bg-surface-subtle px-5 py-6 text-ink-mid"
          >
            <SearchIcon size={20} aria-hidden className="text-ink-softer shrink-0" />
            <span className="text-fs-body">{t("search.results.perDb.empty")}</span>
          </div>
        )
        : (
          <ul className="list-none p-0 m-0">
            {response.hits.map((hit) => (
              <li key={`${hit.type}-${hit.identifier}`} className="border-b border-border-soft last:border-b-0">
                <ResultRow db={db} hit={hit} lang={lang} />
              </li>
            ))}
          </ul>
        )}
      {totalPages > 1 && (
        <div className="flex justify-end">
          <ResultsPagination
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
            {...paginationLabels}
          />
        </div>
      )}
    </section>
  )
}
