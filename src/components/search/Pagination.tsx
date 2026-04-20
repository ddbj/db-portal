import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui"

export interface PaginationProps {
  page: number
  totalPages: number
  onChange: (page: number) => void
  hardLimitReached?: boolean
}

const Pagination = ({
  page,
  totalPages,
  onChange,
  hardLimitReached = false,
}: PaginationProps) => {
  const { t } = useTranslation()
  const prevDisabled = page <= 1
  const nextDisabled = page >= totalPages || hardLimitReached

  return (
    <nav aria-label="pagination" className="flex items-center justify-center gap-4">
      <Button
        variant="tertiary"
        size="sm"
        onClick={() => onChange(page - 1)}
        disabled={prevDisabled}
      >
        {t("routes.search.dbMode.pagination.prev")}
      </Button>
      <span className="text-sm text-gray-600 tabular-nums">
        {t("routes.search.dbMode.pagination.pageInfo", {
          current: page,
          total: totalPages,
        })}
      </span>
      <Button
        variant="tertiary"
        size="sm"
        onClick={() => onChange(page + 1)}
        disabled={nextDisabled}
      >
        {t("routes.search.dbMode.pagination.next")}
      </Button>
    </nav>
  )
}

export default Pagination
