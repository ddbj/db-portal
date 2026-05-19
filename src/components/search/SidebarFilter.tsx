import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  Button,
  Checkbox,
  Heading,
  Input,
  Radio,
  Skeleton,
} from "@/components/ui"
import cn from "@/components/ui/cn"
import type { FacetsResponse } from "@/lib/api"
import {
  type FacetFieldMapping,
  type KeywordFieldMapping,
  sidebarFieldsForDb,
} from "@/lib/sidebar-fields"
import { clearAllSidebar } from "@/lib/sidebar-state-to-chips"
import type {
  DateAxis,
  SidebarDateRange,
  SidebarState,
} from "@/lib/sidebar-state-types"
import type { DbId } from "@/types/db"

const SRA_SUBTYPES = [
  "sra-submission",
  "sra-study",
  "sra-experiment",
  "sra-run",
  "sra-sample",
  "sra-analysis",
] as const
const JGA_SUBTYPES = ["jga-study", "jga-dataset", "jga-dac", "jga-policy"] as const

const FACET_BUCKET_LIMIT = 20
const KEYWORD_DEBOUNCE_MS = 300

export interface SidebarFilterProps {
  db: DbId
  state: SidebarState
  facetsData: FacetsResponse | null
  loading: boolean
  className?: string
  onChange: (next: SidebarState) => void
  subtypeCounts?: Readonly<Record<string, number | null>>
}

export interface FacetBucketLite {
  value: string
  count: number
  label?: string | null
}

const toggleValue = (
  arr: readonly string[],
  value: string,
): readonly string[] =>
  arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]

interface SectionHeadingProps {
  children: string
  onClear?: () => void
  clearLabel?: string
}

const SectionHeading = ({ children, onClear, clearLabel }: SectionHeadingProps) => (
  <div className="mb-2 flex items-baseline justify-between gap-2">
    <h4 className="text-xs font-semibold tracking-wide text-gray-700 uppercase">
      {children}
    </h4>
    {onClear !== undefined && (
      <button
        type="button"
        onClick={onClear}
        className="text-primary-700 hover:text-primary-800 text-xs hover:underline focus:ring-2 focus:ring-gray-300 focus:outline-none"
      >
        {clearLabel}
      </button>
    )}
  </div>
)

export const getFacetBuckets = (
  facetsData: FacetsResponse | null,
  facetKey: string,
): readonly FacetBucketLite[] => {
  const facets = facetsData?.facets
  if (facets === undefined || facets === null) return []
  const value = (facets as Record<string, unknown>)[facetKey]
  if (!Array.isArray(value)) return []

  return value as readonly FacetBucketLite[]
}

export interface FacetSectionProps {
  mapping: FacetFieldMapping
  buckets: readonly FacetBucketLite[]
  selected: readonly string[]
  onToggle: (value: string) => void
  onClear?: () => void
  clearLabel?: string
}

export const FacetSection = ({
  mapping,
  buckets,
  selected,
  onToggle,
  onClear,
  clearLabel,
}: FacetSectionProps) => {
  const { t } = useTranslation()
  const tDynamic = t as unknown as (key: string) => string

  if (buckets.length === 0) return null

  return (
    <section>
      <SectionHeading
        {...(selected.length > 0 && onClear !== undefined && { onClear })}
        {...(clearLabel !== undefined && { clearLabel })}
      >
        {tDynamic(mapping.labelKey)}
      </SectionHeading>
      <div className="space-y-1">
        {buckets.slice(0, FACET_BUCKET_LIMIT).map((bucket) => {
          const facetValue = bucket.label ?? bucket.value

          return (
            <Checkbox
              key={bucket.value}
              label={`${bucket.label ?? bucket.value} (${bucket.count.toLocaleString()})`}
              checked={selected.includes(facetValue)}
              onChange={() => onToggle(facetValue)}
            />
          )
        })}
      </div>
    </section>
  )
}

interface KeywordSectionProps {
  mapping: KeywordFieldMapping
  value: string
  onChange: (next: string) => void
  onClear?: () => void
  clearLabel?: string
}

export interface DateRangeSectionProps {
  axes: readonly DateAxis[]
  value: SidebarDateRange | null
  onChange: (next: SidebarDateRange | null) => void
  onClear?: () => void
  clearLabel?: string
}

const DEFAULT_DATE_AXIS: DateAxis = "date_published"

const formatDateISO = (d: Date): string => {
  const yyyy = d.getFullYear().toString().padStart(4, "0")
  const mm = (d.getMonth() + 1).toString().padStart(2, "0")
  const dd = d.getDate().toString().padStart(2, "0")

  return `${yyyy}-${mm}-${dd}`
}

export const DateRangeSection = (
  { axes, value, onChange, onClear, clearLabel }: DateRangeSectionProps,
) => {
  const { t } = useTranslation()
  const tDynamic = t as unknown as (key: string) => string

  if (axes.length === 0) return null

  const axis = value?.axis ?? DEFAULT_DATE_AXIS
  const from = value?.from ?? ""
  const to = value?.to ?? ""

  const emit = (
    nextAxis: DateAxis,
    nextFrom: string,
    nextTo: string,
  ) => {
    if (nextFrom === "" && nextTo === "") {
      onChange(null)

      return
    }
    onChange({ axis: nextAxis, from: nextFrom, to: nextTo })
  }

  const updateAxis = (next: DateAxis) => emit(next, from, to)
  const updateFrom = (next: string) => emit(axis, next, to)
  const updateTo = (next: string) => emit(axis, from, next)

  const applyQuickRange = (years: number | null) => {
    if (years === null) {
      onChange(null)

      return
    }
    const today = new Date()
    const fromDate = new Date(today)
    fromDate.setFullYear(today.getFullYear() - years)
    onChange({
      axis,
      from: formatDateISO(fromDate),
      to: formatDateISO(today),
    })
  }

  return (
    <section>
      <SectionHeading
        {...(value !== null && onClear !== undefined && { onClear })}
        {...(clearLabel !== undefined && { clearLabel })}
      >
        {t("routes.searchResults.sidebar.dateRange.title")}
      </SectionHeading>
      <div className="space-y-3">
        <div className="space-y-1">
          {axes.map((a) => (
            <Radio
              key={a}
              label={tDynamic(`routes.searchResults.sidebar.dateRange.axis.${a}`)}
              name="sidebar-date-axis"
              checked={axis === a}
              onChange={() => updateAxis(a)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          <Button variant="tertiary" size="sm" onClick={() => applyQuickRange(null)}>
            {t("routes.searchResults.sidebar.dateRange.quick.all")}
          </Button>
          <Button variant="tertiary" size="sm" onClick={() => applyQuickRange(1)}>
            {t("routes.searchResults.sidebar.dateRange.quick.year1")}
          </Button>
          <Button variant="tertiary" size="sm" onClick={() => applyQuickRange(5)}>
            {t("routes.searchResults.sidebar.dateRange.quick.year5")}
          </Button>
          <Button variant="tertiary" size="sm" onClick={() => applyQuickRange(10)}>
            {t("routes.searchResults.sidebar.dateRange.quick.year10")}
          </Button>
        </div>
        <div className="space-y-1">
          <label className="block text-xs">
            <span className="block text-gray-700">
              {t("routes.searchResults.sidebar.dateRange.from")}
            </span>
            <Input
              type="date"
              value={from}
              onChange={(e) => updateFrom(e.target.value)}
            />
          </label>
          <label className="block text-xs">
            <span className="block text-gray-700">
              {t("routes.searchResults.sidebar.dateRange.to")}
            </span>
            <Input
              type="date"
              value={to}
              onChange={(e) => updateTo(e.target.value)}
            />
          </label>
        </div>
      </div>
    </section>
  )
}

const KeywordSection = (
  { mapping, value, onChange, onClear, clearLabel }: KeywordSectionProps,
) => {
  const { t } = useTranslation()
  const tDynamic = t as unknown as (key: string) => string
  const [local, setLocal] = useState(value)

  useEffect(() => {
    setLocal(value)
  }, [value])

  useEffect(() => {
    if (local === value) return
    const timer = setTimeout(() => onChange(local), KEYWORD_DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [local, value, onChange])

  return (
    <section>
      <SectionHeading
        {...(value !== "" && onClear !== undefined && { onClear })}
        {...(clearLabel !== undefined && { clearLabel })}
      >
        {tDynamic(mapping.labelKey)}
      </SectionHeading>
      <Input
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={t("routes.searchResults.sidebar.keywordPlaceholder")}
      />
    </section>
  )
}

const formatSubtypeLabel = (
  subtype: string,
  translate: (key: string) => string,
  counts?: Readonly<Record<string, number | null>>,
): string => {
  const key = `routes.searchResults.sidebar.subtypeLabel.${subtype}`
  const translated = translate(key)
  const displayName = translated === key ? subtype : translated
  const count = counts?.[subtype] ?? null
  if (count === null) return displayName

  return `${displayName} (${count.toLocaleString()})`
}

const SidebarFilter = ({
  db,
  state,
  facetsData,
  loading,
  className,
  onChange,
  subtypeCounts,
}: SidebarFilterProps) => {
  const { t } = useTranslation()
  const tDynamic = t as unknown as (key: string) => string
  const fields = sidebarFieldsForDb(db, state.subtype)
  const subtypes: readonly string[] = db === "sra"
    ? SRA_SUBTYPES
    : db === "jga"
      ? JGA_SUBTYPES
      : []

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
    updateFacetValues(dslName, toggleValue(current, value))
  }

  const updateKeyword = (dslName: string, value: string) => {
    const trimmed = value.trim()
    const newKeywords: Record<string, string> = {}
    for (const [k, v] of Object.entries(state.keywords)) {
      if (k !== dslName) newKeywords[k] = v
    }
    if (trimmed !== "") newKeywords[dslName] = trimmed
    onChange({ ...state, keywords: newKeywords })
  }

  const updateSubtype = (subtype: string | null) => {
    onChange({ ...state, subtype })
  }

  const clearSectionLabel = t("routes.searchResults.sidebar.clearSection")
  const hasAnyFilter = Object.keys(state.facets).length > 0
    || Object.keys(state.keywords).length > 0
    || state.dateRange !== null
    || state.subtype !== null

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

      {subtypes.length > 0 && (
        <section>
          <SectionHeading
            {...(state.subtype !== null && { onClear: () => updateSubtype(null) })}
            clearLabel={clearSectionLabel}
          >
            {t("routes.searchResults.sidebar.entryType")}
          </SectionHeading>
          <div className="space-y-1">
            <Radio
              label={t("routes.searchResults.sidebar.all")}
              name={`${db}-subtype`}
              checked={state.subtype === null}
              onChange={() => updateSubtype(null)}
            />
            {subtypes.map((subtype) => (
              <Radio
                key={subtype}
                label={formatSubtypeLabel(subtype, tDynamic, subtypeCounts)}
                name={`${db}-subtype`}
                checked={state.subtype === subtype}
                onChange={() => updateSubtype(subtype)}
              />
            ))}
          </div>
        </section>
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

      {fields.keywords.map((mapping) => (
        <KeywordSection
          key={mapping.dslName}
          mapping={mapping}
          value={state.keywords[mapping.dslName] ?? ""}
          onChange={(value) => updateKeyword(mapping.dslName, value)}
          onClear={() => updateKeyword(mapping.dslName, "")}
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

export default SidebarFilter
