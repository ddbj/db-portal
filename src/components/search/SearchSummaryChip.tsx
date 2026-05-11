import { X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { Button } from "@/components/ui"
import cn from "@/components/ui/cn"
import { DATABASES } from "@/lib/mock-data"
import { ALL_DB_VALUE, type DbSelectValue } from "@/lib/search-url"

export interface SearchSummaryChipProps {
  mode: "simple" | "advanced" | "combined"
  q?: string
  adv?: string
  db: DbSelectValue
  onClear: () => void
  editHref?: string
  className?: string
}

const SearchSummaryChip = ({
  mode,
  q,
  adv,
  db,
  onClear,
  editHref,
  className,
}: SearchSummaryChipProps) => {
  const { t } = useTranslation()

  const dbName = db === ALL_DB_VALUE
    ? null
    : DATABASES.find((d) => d.id === db)?.displayName ?? db
  const prefix = dbName === null
    ? t("routes.search.summary.filteredByAll")
    : t("routes.search.summary.filteredByDb", { db: dbName })

  const summary = mode === "combined"
    ? t("routes.search.summary.combinedSummary", { q: q ?? "", adv: adv ?? "" })
    : mode === "simple"
      ? (q ?? "")
      : (adv ?? "")

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2",
        className,
      )}
    >
      <span className="min-w-0 flex-1 text-sm break-all text-gray-700">
        {prefix}
        <span className="font-medium">{summary}</span>
      </span>
      {editHref !== undefined && (
        <Link
          to={editHref}
          className="text-primary-700 hover:text-primary-800 text-xs underline"
        >
          {t("routes.search.summary.edit")}
        </Link>
      )}
      <Button
        variant="tertiary"
        size="sm"
        onClick={onClear}
        aria-label={t("routes.search.summary.clearAria")}
        className="inline-flex items-center gap-1"
      >
        <X className="h-3 w-3" aria-hidden="true" />
        {t("routes.search.summary.clear")}
      </Button>
    </div>
  )
}

export default SearchSummaryChip
