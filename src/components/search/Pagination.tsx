import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { type KeyboardEvent, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui"

export interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
  hardLimitReached?: boolean
  cursorMode?: boolean
  nextCursor?: string | null
  onCursorNext?: (cursor: string) => void
  /** Solr backed の場合の最終到達可能ページ (= 10000 / perPage) を渡すと「最後へ」がそこに合わせる */
  maxJumpPage?: number
}

const Pagination = ({
  page,
  totalPages,
  onChange,
  hardLimitReached = false,
  cursorMode = false,
  nextCursor = null,
  onCursorNext,
  maxJumpPage,
}: PaginationProps) => {
  const { t } = useTranslation()
  const prevDisabled = cursorMode ? false : page <= 1
  const hasNextCursor = nextCursor !== null && nextCursor !== ""
  const nextDisabled = cursorMode
    ? !hasNextCursor
    : (page >= totalPages || hardLimitReached)

  const lastPage = Math.min(totalPages, maxJumpPage ?? totalPages)
  const firstDisabled = cursorMode || page <= 1
  const lastDisabled = cursorMode || page >= lastPage

  const [inputValue, setInputValue] = useState(String(page))

  useEffect(() => {
    setInputValue(String(page))
  }, [page])

  const commitInput = () => {
    const parsed = Number.parseInt(inputValue, 10)
    if (Number.isNaN(parsed)) {
      setInputValue(String(page))

      return
    }
    const clamped = Math.max(1, Math.min(parsed, lastPage))
    if (clamped !== page) {
      onChange(clamped)
    } else {
      setInputValue(String(clamped))
    }
  }

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      commitInput()
    } else if (e.key === "Escape") {
      e.preventDefault()
      setInputValue(String(page))
      ;(e.currentTarget as HTMLInputElement).blur()
    }
  }

  const handlePrev = () => {
    if (cursorMode) {
      onChange(1)
    } else {
      onChange(page - 1)
    }
  }

  const handleNext = () => {
    if (cursorMode && onCursorNext !== undefined && hasNextCursor) {
      onCursorNext(nextCursor)
    } else if (!cursorMode) {
      onChange(page + 1)
    }
  }

  if (cursorMode) {
    return (
      <nav
        aria-label="pagination"
        className="flex flex-wrap items-center justify-center gap-2"
      >
        <Button variant="tertiary" size="sm" onClick={handlePrev} disabled={prevDisabled}>
          <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
          {t("routes.searchResults.dbMode.pagination.prev")}
        </Button>
        <span className="text-sm text-gray-600">
          {t("routes.searchResults.dbMode.pagination.cursorMode")}
        </span>
        <Button variant="tertiary" size="sm" onClick={handleNext} disabled={nextDisabled}>
          {t("routes.searchResults.dbMode.pagination.next")}
          <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
        </Button>
      </nav>
    )
  }

  return (
    <nav
      aria-label="pagination"
      className="flex flex-wrap items-center justify-center gap-2"
    >
      <Button
        variant="tertiary"
        size="sm"
        onClick={() => onChange(1)}
        disabled={firstDisabled}
        aria-label={t("routes.searchResults.dbMode.pagination.first")}
      >
        <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button variant="tertiary" size="sm" onClick={handlePrev} disabled={prevDisabled}>
        <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
        {t("routes.searchResults.dbMode.pagination.prev")}
      </Button>
      <label className="flex items-center gap-1.5 text-sm text-gray-600 tabular-nums">
        <span>{t("routes.searchResults.dbMode.pagination.pageInputLabel")}</span>
        <input
          type="number"
          min={1}
          max={lastPage}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={commitInput}
          onKeyDown={handleInputKeyDown}
          aria-label={t("routes.searchResults.dbMode.pagination.pageInputAria")}
          className="focus:border-primary-500 focus:ring-primary-200 w-16 rounded-md border border-gray-300 px-2 py-1 text-center text-sm tabular-nums focus:ring-2 focus:outline-none"
        />
        <span>
          {t("routes.searchResults.dbMode.pagination.pageOf", { total: lastPage })}
        </span>
      </label>
      <Button variant="tertiary" size="sm" onClick={handleNext} disabled={nextDisabled}>
        {t("routes.searchResults.dbMode.pagination.next")}
        <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        variant="tertiary"
        size="sm"
        onClick={() => onChange(lastPage)}
        disabled={lastDisabled}
        aria-label={t("routes.searchResults.dbMode.pagination.last")}
      >
        <ChevronsRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </nav>
  )
}

export default Pagination
