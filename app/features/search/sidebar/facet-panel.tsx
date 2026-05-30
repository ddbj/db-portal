import { type Dispatch, useState } from "react"

import type { DbPortalFacets } from "~/lib/api"
import { useT } from "~/lib/i18n"
import { type AppliedFilter, AppliedFilters, DateFacet, FacetGroup, FacetRow, SidebarHeading, TextInput } from "~/ui"

import type { DbSlug } from "../types"
import { type FilterRow, scopeFilters } from "./facet-config"
import type { SearchFacetAction, SearchFacetState } from "./facet-state"

export type FacetPanelProps = {
  state: SearchFacetState
  dispatch: Dispatch<SearchFacetAction>
  db: DbSlug | null
  facets: DbPortalFacets | null
}

type Bucket = { value: string; count: number; label?: string }

const VISIBLE = 8

const bucketsFor = (facets: DbPortalFacets | null, row: FilterRow): readonly Bucket[] => {
  if (!row.facetName) return []
  const raw = facets?.[row.facetName]

  return (raw ?? []) as readonly Bucket[]
}

const bucketLabel = (row: FilterRow, bucket: Bucket): string =>
  row.organism ? (bucket.label ?? bucket.value) : bucket.value

// Resolve a selected facet value to its display label (organism shows the
// scientific name from the bucket; everything else shows the value itself).
const valueLabel = (row: FilterRow, value: string, buckets: readonly Bucket[]): string => {
  if (!row.organism) return value

  return buckets.find((b) => b.value === value)?.label ?? value
}

const FacetSection = ({
  row,
  selected,
  buckets,
  onToggle,
  onClear,
}: {
  row: FilterRow
  selected: readonly string[]
  buckets: readonly Bucket[]
  onToggle: (value: string) => void
  onClear: () => void
}) => {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  // Show selected values even when they fall outside the current top buckets.
  const extras: Bucket[] = selected
    .filter((v) => !buckets.some((b) => b.value === v))
    .map((value) => ({ value, count: 0 }))
  const options = [...buckets, ...extras]
  if (options.length === 0) return null
  const visible = expanded ? options : options.slice(0, VISIBLE)

  return (
    <div data-testid={`facet-${row.key}`}>
      <FacetGroup
        label={t(`search.facets.field.${row.key}`)}
        appliedCount={selected.length}
        {...(selected.length > 0 ? { onClear } : {})}
        showMore={options.length > VISIBLE && !expanded}
        showMoreLabel={t("search.facets.showMore")}
        onShowMore={() => setExpanded(true)}
      >
        {visible.map((bucket) => (
          <FacetRow
            key={bucket.value}
            type="checkbox"
            name={row.key}
            label={bucketLabel(row, bucket)}
            {...(bucket.count > 0 ? { count: bucket.count.toLocaleString("en-US") } : {})}
            checked={selected.includes(bucket.value)}
            onChange={() => onToggle(bucket.value)}
          />
        ))}
      </FacetGroup>
    </div>
  )
}

const TextSection = ({
  row,
  value,
  onChange,
}: {
  row: FilterRow
  value: string
  onChange: (value: string) => void
}) => {
  const t = useT()
  const label = t(`search.facets.field.${row.key}`)

  return (
    <label className="flex flex-col gap-1" data-testid={`text-${row.key}`}>
      <span className="text-fs-label text-ink-mid">{label}</span>
      <TextInput
        ariaLabel={label}
        size="sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

const NumberRangeSection = ({
  row,
  from,
  to,
  onFromChange,
  onToChange,
}: {
  row: FilterRow
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
}) => {
  const t = useT()
  const label = t(`search.facets.field.${row.key}`)

  return (
    <div className="flex flex-col gap-1" data-testid={`range-${row.key}`}>
      <span className="text-fs-label text-ink-mid">{label}</span>
      <div className="flex items-center gap-2">
        <TextInput
          ariaLabel={`${label} ${t("search.facets.dateRange.fromLabel")}`}
          size="sm"
          type="number"
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
        />
        <span className="text-fs-label text-ink-soft">–</span>
        <TextInput
          ariaLabel={`${label} ${t("search.facets.dateRange.toLabel")}`}
          size="sm"
          type="number"
          value={to}
          onChange={(e) => onToChange(e.target.value)}
        />
      </div>
    </div>
  )
}

export const FacetPanel = ({ state, dispatch, db, facets }: FacetPanelProps) => {
  const t = useT()
  const rows = scopeFilters(db)
  const fieldLabel = (key: string): string => t(`search.facets.field.${key}`)

  const applied: AppliedFilter[] = []
  for (const row of rows) {
    if (row.kind === "facet") {
      const selected = state.facets[row.key] ?? []
      const buckets = bucketsFor(facets, row)
      for (const value of selected) {
        applied.push({
          label: fieldLabel(row.key),
          value: valueLabel(row, value, buckets),
          onClear: () => dispatch({ type: "toggleFacet", key: row.key, value }),
        })
      }
    } else if (row.kind === "text") {
      const value = state.texts[row.key] ?? ""
      if (value.trim() !== "") {
        applied.push({
          label: fieldLabel(row.key),
          value,
          onClear: () => dispatch({ type: "setText", key: row.key, value: "" }),
        })
      }
    } else if (row.kind === "numberRange") {
      const range = state.ranges[row.key]
      // Only a complete range is emitted (between needs both bounds), so the
      // applied chip mirrors that — a half-filled range is not an active filter.
      if (range && range.from !== "" && range.to !== "") {
        applied.push({
          label: fieldLabel(row.key),
          value: `${range.from || "*"} – ${range.to || "*"}`,
          onClear: () => {
            dispatch({ type: "setRangeFrom", key: row.key, value: "" })
            dispatch({ type: "setRangeTo", key: row.key, value: "" })
          },
        })
      }
    }
  }
  const { datePublished } = state
  // Active iff something is actually emitted: a preset, or a complete custom range.
  const dateActive = datePublished.active !== "all"
    || (datePublished.from !== "" && datePublished.to !== "")

  return (
    <aside className="flex flex-col gap-4">
      <SidebarHeading withDivider>{t("search.facets.heading")}</SidebarHeading>
      <AppliedFilters applied={applied} onClearAll={() => dispatch({ type: "clear" })} />
      {rows.map((row) => {
        if (row.kind === "facet") {
          const selected = state.facets[row.key] ?? []

          return (
            <FacetSection
              key={row.key}
              row={row}
              selected={selected}
              buckets={bucketsFor(facets, row)}
              onToggle={(value) => dispatch({ type: "toggleFacet", key: row.key, value })}
              onClear={() => dispatch({ type: "clearFacet", key: row.key })}
            />
          )
        }
        if (row.kind === "text") {
          return (
            <TextSection
              key={row.key}
              row={row}
              value={state.texts[row.key] ?? ""}
              onChange={(value) => dispatch({ type: "setText", key: row.key, value })}
            />
          )
        }
        if (row.kind === "dateRange") {
          return (
            <DateFacet
              key={row.key}
              label={fieldLabel(row.key)}
              active={datePublished.active}
              appliedCount={dateActive ? 1 : 0}
              onClear={() => dispatch({ type: "setDateRange", active: "all" })}
              onRangeChange={(active) => dispatch({ type: "setDateRange", active })}
              from={datePublished.from}
              to={datePublished.to}
              onFromChange={(value) => dispatch({ type: "setDateFrom", value })}
              onToChange={(value) => dispatch({ type: "setDateTo", value })}
            />
          )
        }
        const range = state.ranges[row.key] ?? { from: "", to: "" }

        return (
          <NumberRangeSection
            key={row.key}
            row={row}
            from={range.from}
            to={range.to}
            onFromChange={(value) => dispatch({ type: "setRangeFrom", key: row.key, value })}
            onToChange={(value) => dispatch({ type: "setRangeTo", key: row.key, value })}
          />
        )
      })}
    </aside>
  )
}
