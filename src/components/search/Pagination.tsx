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
}

const Pagination = ({
  page,
  totalPages,
  onChange,
  hardLimitReached = false,
  cursorMode = false,
  nextCursor = null,
  onCursorNext,
}: PaginationProps) => {
  const { t } = useTranslation()
  const prevDisabled = cursorMode ? false : page <= 1
  const hasNextCursor = nextCursor !== null && nextCursor !== ""
  const nextDisabled = cursorMode
    ? !hasNextCursor
    : (page >= totalPages || hardLimitReached)

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

  return (
    <nav aria-label="pagination" className="flex items-center justify-center gap-4">
      <Button
        variant="tertiary"
        size="sm"
        onClick={handlePrev}
        disabled={prevDisabled}
      >
        {t("routes.search.dbMode.pagination.prev")}
      </Button>
      {cursorMode
        ? (
          <span className="text-sm text-gray-600">
            {t("routes.search.dbMode.pagination.cursorMode")}
          </span>
        )
        : (
          <span className="text-sm text-gray-600 tabular-nums">
            {t("routes.search.dbMode.pagination.pageInfo", {
              current: page,
              total: totalPages,
            })}
          </span>
        )}
      <Button
        variant="tertiary"
        size="sm"
        onClick={handleNext}
        disabled={nextDisabled}
      >
        {t("routes.search.dbMode.pagination.next")}
      </Button>
    </nav>
  )
}

export default Pagination
