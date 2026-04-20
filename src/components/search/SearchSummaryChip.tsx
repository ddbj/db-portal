import { X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router"

import { Button } from "@/components/ui"
import cn from "@/components/ui/cn"
import { DATABASES } from "@/lib/mock-data"
import { ALL_DB_VALUE, type DbSelectValue } from "@/lib/search-url"

export interface SearchSummaryChipProps {
  mode: "simple" | "advanced"
  q?: string
  adv?: string
  db: DbSelectValue
  onClear: () => void
  editHref?: string
  className?: string
}

const MAX_LENGTH = 50

const truncate = (s: string, n: number): string =>
  s.length > n ? `${s.slice(0, n - 1)}…` : s

export const countAdvConditions = (dsl: string): number => {
  const trimmed = dsl.trim()
  if (trimmed === "") return 0
  const parts = trimmed.split(/\s+(?:AND|OR|NOT)\s+/i)

  return parts.length
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

  let summary: string
  if (mode === "simple") {
    summary = truncate(q ?? "", MAX_LENGTH)
  } else {
    const dsl = adv ?? ""
    const count = countAdvConditions(dsl)
    if (count <= 2) {
      summary = truncate(dsl, MAX_LENGTH)
    } else {
      const firstPart = dsl.trim().split(/\s+(?:AND|OR|NOT)\s+/i)[0] ?? ""
      summary =
        truncate(firstPart, MAX_LENGTH) +
        t("routes.search.summary.otherConditions", { count: count - 1 })
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2",
        className,
      )}
    >
      <span className="text-sm text-gray-700">
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
