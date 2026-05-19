import { Pencil, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { Button } from "@/components/ui"
import cn from "@/components/ui/cn"
import { DATABASES } from "@/lib/mock-data"
import { ALL_DB_VALUE, type DbSelectValue } from "@/lib/search-url"

export interface SearchSummaryChipProps {
  mode: "simple"
  q: string
  db: DbSelectValue
  onClear: () => void
  advancedSearchHref: string
  className?: string
}

const SearchSummaryChip = ({
  q,
  db,
  onClear,
  advancedSearchHref,
  className,
}: SearchSummaryChipProps) => {
  const { t } = useTranslation()

  const dbName = db === ALL_DB_VALUE
    ? null
    : DATABASES.find((d) => d.id === db)?.displayName ?? db
  const prefix = dbName === null
    ? t("routes.searchResults.summary.filteredByAll")
    : t("routes.searchResults.summary.filteredByDb", { db: dbName })

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2",
        className,
      )}
    >
      <span className="min-w-0 flex-1 text-sm break-all text-gray-700">
        {prefix}
        <span className="font-medium">{q}</span>
      </span>
      <Link
        to={advancedSearchHref}
        className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs leading-none font-medium text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 focus:outline-none"
      >
        <Pencil className="h-3 w-3" aria-hidden="true" />
        {t("routes.searchResults.summary.editInAdvanced")}
      </Link>
      <Button
        variant="tertiary"
        size="sm"
        onClick={onClear}
        aria-label={t("routes.searchResults.summary.clearAria")}
        className="inline-flex items-center gap-1"
      >
        <X className="h-3 w-3" aria-hidden="true" />
        {t("routes.searchResults.summary.clear")}
      </Button>
    </div>
  )
}

export default SearchSummaryChip
