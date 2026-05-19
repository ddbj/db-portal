import { useTranslation } from "react-i18next"

import { Chip } from "@/components/ui"
import cn from "@/components/ui/cn"
import type { SidebarFieldsForDb } from "@/lib/sidebar-fields"
import {
  type ActiveChipDescriptor,
  clearAllSidebar,
  sidebarStateToChips,
} from "@/lib/sidebar-state-to-chips"
import type { SidebarState } from "@/lib/sidebar-state-types"

export interface ActiveFilterChipsProps {
  state: SidebarState
  fields: SidebarFieldsForDb
  onChange: (next: SidebarState) => void
  className?: string
}

const ActiveFilterChips = (
  { state, fields, onChange, className }: ActiveFilterChipsProps,
) => {
  const { t } = useTranslation()
  const tDynamic = t as unknown as (
    key: string,
    opts?: Record<string, unknown>,
  ) => string

  const chips = sidebarStateToChips(state, fields)
  if (chips.length === 0) return null

  const formatChipLabel = (chip: ActiveChipDescriptor): string => {
    const prefix = tDynamic(chip.labelKey)
    if (chip.kind === "date") {
      const { from, to } = chip
      let value: string
      if (from !== "" && to !== "") {
        value = t("routes.searchResults.activeFilters.dateRangeFormat", {
          from,
          to,
        })
      } else if (from !== "") {
        value = t("routes.searchResults.activeFilters.dateRangeFromOnly", {
          from,
        })
      } else if (to !== "") {
        value = t("routes.searchResults.activeFilters.dateRangeToOnly", { to })
      } else {
        return prefix
      }

      return `${prefix}: ${value}`
    }

    return `${prefix}: ${chip.value}`
  }

  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      aria-label={t("routes.searchResults.activeFilters.label")}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-gray-500 uppercase">
          {t("routes.searchResults.activeFilters.label")}
        </span>
        <button
          type="button"
          onClick={() => onChange(clearAllSidebar(state))}
          className="text-primary-700 hover:text-primary-800 text-xs hover:underline focus:ring-2 focus:ring-gray-300 focus:outline-none"
        >
          {t("routes.searchResults.activeFilters.clearAll")}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <Chip
            key={chip.id}
            variant="removable"
            onRemove={() => onChange(chip.nextState)}
          >
            {formatChipLabel(chip)}
          </Chip>
        ))}
      </div>
    </div>
  )
}

export default ActiveFilterChips
