import { useTranslation } from "react-i18next"

import { Heading, Skeleton } from "@/components/ui"
import cn from "@/components/ui/cn"
import type { FacetsResponse } from "@/lib/api"
import { CROSS_SIDEBAR_FIELDS } from "@/lib/sidebar-fields"
import { clearAllSidebar } from "@/lib/sidebar-state-to-chips"
import type { SidebarState } from "@/lib/sidebar-state-types"

import {
  DateRangeSection,
  FacetSection,
  getFacetBuckets,
} from "./SidebarFilter"

export interface CrossSidebarFilterProps {
  state: SidebarState
  facetsData: FacetsResponse | null
  loading: boolean
  className?: string
  onChange: (next: SidebarState) => void
}

const CrossSidebarFilter = ({
  state,
  facetsData,
  loading,
  className,
  onChange,
}: CrossSidebarFilterProps) => {
  const { t } = useTranslation()
  const fields = CROSS_SIDEBAR_FIELDS

  const clearSectionLabel = t("routes.searchResults.sidebar.clearSection")
  const hasAnyFilter = Object.keys(state.facets).length > 0
    || state.dateRange !== null

  const updateFacetValues = (dslName: string, values: readonly string[]) => {
    const newFacets: Record<string, readonly string[]> = {}
    for (const [k, v] of Object.entries(state.facets)) {
      if (k !== dslName) newFacets[k] = v
    }
    if (values.length > 0) newFacets[dslName] = values
    onChange({ ...state, facets: newFacets })
  }

  const toggleFacet = (dslName: string, value: string) => {
    const current = state.facets[dslName] ?? []
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    updateFacetValues(dslName, next)
  }

  const handleClearAll = () => onChange(clearAllSidebar(state))

  return (
    <aside
      className={cn("w-64 flex-shrink-0 space-y-6", className)}
      aria-label={t("routes.searchResults.sidebar.label")}
    >
      <div className="flex items-baseline justify-between gap-2">
        <Heading level={3} className="mb-0 text-sm font-semibold text-gray-900">
          {t("routes.searchResults.sidebar.title")}
        </Heading>
        {hasAnyFilter && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-primary-700 hover:text-primary-800 text-xs hover:underline focus:ring-2 focus:ring-gray-300 focus:outline-none"
          >
            {t("routes.searchResults.sidebar.clearAll")}
          </button>
        )}
      </div>

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      )}

      {fields.facets.map((mapping) => (
        <FacetSection
          key={mapping.facetKey}
          mapping={mapping}
          buckets={getFacetBuckets(facetsData, mapping.facetKey)}
          selected={state.facets[mapping.dslName] ?? []}
          onToggle={(value) => toggleFacet(mapping.dslName, value)}
          onClear={() => updateFacetValues(mapping.dslName, [])}
          clearLabel={clearSectionLabel}
        />
      ))}

      <DateRangeSection
        axes={fields.dateAxes}
        value={state.dateRange}
        onChange={(next) => onChange({ ...state, dateRange: next })}
        onClear={() => onChange({ ...state, dateRange: null })}
        clearLabel={clearSectionLabel}
      />
    </aside>
  )
}

export default CrossSidebarFilter
