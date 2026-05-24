import { useT } from "~/lib/i18n"
import { Pagination as PaginationPrimitive } from "~/ui"

export type ResultsPaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export const ResultsPagination = ({ page, totalPages, onPageChange }: ResultsPaginationProps) => {
  const t = useT()
  if (totalPages <= 1) return null

  return (
    <PaginationPrimitive
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
      ariaLabel={t("a11y.paginationNav")}
    />
  )
}
