import type { DbSearchResponse } from "~/lib/api"
import { type Lang, useT } from "~/lib/i18n"
import { Callout, NativeSelect, type NativeSelectOption, Tag } from "~/ui"

import {
  type DbSlug,
  PER_PAGE_VALUES,
  type PerPageValue,
  SORT_KEYS,
  type SortKey,
} from "../types"
import {
  DEFAULT_PAGE,
  DEFAULT_PER_PAGE,
  DEFAULT_SORT,
} from "../url/url-params"
import { ResultsPagination } from "./pagination"
import { ResultCard } from "./result-card"

export type PerDbResultsProps = {
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
  const totalPages = response.total === 0 ? 0 : Math.ceil(response.total / perPage)
  const { start, end } = computeRange(response.total, page, perPage)

  const sortOptions: NativeSelectOption[] = SORT_KEYS.map((key) => {
    const labelKey = key === "relevance"
      ? "search.results.sort.relevance"
      : key === "date_desc" ? "search.results.sort.dateDesc" : "search.results.sort.dateAsc"

    return { value: key, label: t(labelKey) }
  })
  const perPageOptions: NativeSelectOption[] = PER_PAGE_VALUES.map((value) => ({
    value: String(value),
    label: String(value),
  }))

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <p
          className="text-fs-body-sm text-ink-mid m-0"
          aria-live="polite"
          aria-atomic="true"
        >
          {response.total === 0
            ? t("search.results.perDb.empty")
            : t("search.results.perDb.rangeSummary", {
              start: start.toLocaleString("en-US"),
              end: end.toLocaleString("en-US"),
              total: response.total.toLocaleString("en-US"),
            })}
        </p>
        {response.hardLimitReached && (
          <Tag kind="status" tone="warning" size="sm">{t("search.results.perDb.hardLimit")}</Tag>
        )}
        <div className="ml-auto flex items-center gap-3">
          <label className="text-fs-label text-ink-mid inline-flex items-center gap-2">
            <span>{t("search.results.sort.label")}</span>
            <NativeSelect
              ariaLabel={t("search.results.sort.label")}
              options={sortOptions}
              value={sort}
              onChange={(event) => onSortChange(event.currentTarget.value as SortKey)}
              width={148}
            />
          </label>
          <label className="text-fs-label text-ink-mid inline-flex items-center gap-2">
            <span>{t("search.results.perPage.label")}</span>
            <NativeSelect
              ariaLabel={t("search.results.perPage.label")}
              options={perPageOptions}
              value={String(perPage)}
              onChange={(event) => {
                const next = Number.parseInt(event.currentTarget.value, 10)
                if (PER_PAGE_VALUES.includes(next as PerPageValue)) {
                  onPerPageChange(next as PerPageValue)
                }
              }}
              width={80}
            />
          </label>
          <ResultsPagination
            page={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      </div>
      {response.total === 0
        ? <Callout tone="info" role="status">{t("search.results.perDb.empty")}</Callout>
        : (
          <ul className="list-none p-0 m-0 flex flex-col gap-3">
            {response.hits.map((hit) => (
              <li key={`${hit.type}-${hit.identifier}`}>
                <ResultCard db={db} hit={hit} lang={lang} />
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
          />
        </div>
      )}
    </section>
  )
}
