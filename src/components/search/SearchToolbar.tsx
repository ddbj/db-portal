import { useTranslation } from "react-i18next"

import { Select } from "@/components/ui"
import {
  PER_PAGE_VALUES,
  type PerPageValue,
  SORT_VALUES,
  type SortValue,
} from "@/lib/search-url"

import Pagination from "./Pagination"

export interface SearchToolbarProps {
  total: number
  page: number
  perPage: PerPageValue
  sort: SortValue
  onSortChange: (sort: SortValue) => void
  onPerPageChange: (perPage: PerPageValue) => void
  isOver10kLimit?: boolean
  totalPages: number
  onPageChange: (page: number) => void
  hardLimitReached?: boolean
  cursorMode?: boolean
  nextCursor?: string | null
  onCursorNext?: (cursor: string) => void
  maxJumpPage?: number
}

const SearchToolbar = ({
  total,
  page,
  perPage,
  sort,
  onSortChange,
  onPerPageChange,
  isOver10kLimit = false,
  totalPages,
  onPageChange,
  hardLimitReached = false,
  cursorMode = false,
  nextCursor = null,
  onCursorNext,
  maxJumpPage,
}: SearchToolbarProps) => {
  const { t } = useTranslation()
  const hasResults = total > 0
  const from = hasResults ? (page - 1) * perPage + 1 : 0
  const to = hasResults ? Math.min(from + perPage - 1, total) : 0

  const countLabel = t("routes.searchResults.dbMode.resultsCount", {
    from,
    to,
    total: total.toLocaleString(),
  })

  const sortOptions = SORT_VALUES.map((v) => ({
    value: v,
    label: t(`routes.searchResults.dbMode.sort.${v}`),
  }))
  const perPageOptions = PER_PAGE_VALUES.map((v) => ({
    value: String(v),
    label: t("routes.searchResults.dbMode.perPage.option", { count: v }),
  }))

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-gray-200 pb-3">
      <p className="flex flex-wrap items-baseline gap-x-2 text-sm text-gray-700 tabular-nums">
        <span>{countLabel}</span>
        {isOver10kLimit && (
          <span className="text-xs text-gray-500">
            {t("routes.searchResults.dbMode.over10k.inlineNote")}
          </span>
        )}
      </p>
      <Pagination
        page={page}
        totalPages={totalPages}
        onChange={onPageChange}
        hardLimitReached={hardLimitReached}
        cursorMode={cursorMode}
        nextCursor={nextCursor}
        {...(onCursorNext !== undefined && { onCursorNext })}
        {...(maxJumpPage !== undefined && { maxJumpPage })}
      />
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span>{t("routes.searchResults.dbMode.sort.label")}</span>
          <Select
            selectSize="sm"
            options={sortOptions}
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortValue)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span>{t("routes.searchResults.dbMode.perPage.label")}</span>
          <Select
            selectSize="sm"
            options={perPageOptions}
            value={String(perPage)}
            onChange={(e) => onPerPageChange(Number(e.target.value) as PerPageValue)}
          />
        </label>
      </div>
    </div>
  )
}

export default SearchToolbar
