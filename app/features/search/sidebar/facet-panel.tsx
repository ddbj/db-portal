import { type Dispatch, useEffect, useRef, useState } from "react"

import type { DbPortalFacets } from "~/lib/api"
import { useT } from "~/lib/i18n"
import { type AppliedFilter, AppliedFilters, DateFacet, FacetGroup, FacetRow, SidebarHeading, TextInput } from "~/ui"

import type { DbSlug } from "../types"
import { presetRangeToDates } from "./date-preset"
import { type FilterRow, scopeFilters } from "./facet-config"
import { EMPTY_DATE_RANGE, type SearchFacetAction, type SearchFacetState } from "./facet-state"

type FacetPanelProps = {
  state: SearchFacetState
  dispatch: Dispatch<SearchFacetAction>
  db: DbSlug | null
  facets: DbPortalFacets | null
}

type Bucket = { value: string; count: number; label?: string }

// Collapsed shows VISIBLE values; expanded shows up to CAP (more than that is
// not surfaced in the sidebar — keyword / builder cover the long tail).
const VISIBLE = 8
const CAP = 20

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

// Comma-separated taxID editor for the organism facet. The box and the bucket
// checkboxes are two views of the same state.facets.organism, so the box parses
// to the canonical selection: split on comma, trim, drop empties, dedupe (first
// occurrence wins). Values absent from the buckets (minor taxIDs) survive too.
const TAX_ID_SEP = ", "

const parseTaxIds = (raw: string): string[] => {
  const out: string[] = []
  for (const part of raw.split(",")) {
    const value = part.trim()
    if (value !== "" && !out.includes(value)) out.push(value)
  }

  return out
}

const sameValues = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((value, i) => value === b[i])

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
  // Cap the rendered buckets (collapsed: VISIBLE, expanded: CAP), but always keep
  // selected values visible even when they fall outside the cap or top buckets.
  const shown = buckets.slice(0, expanded ? CAP : VISIBLE)
  const shownValues = new Set(shown.map((b) => b.value))
  const extras: Bucket[] = selected
    .filter((v) => !shownValues.has(v))
    .map((value) => ({ value, count: 0 }))
  const visible = [...shown, ...extras]
  if (visible.length === 0) return null
  // The toggle appears once there are more buckets than the collapsed view; it
  // both expands (up to CAP) and collapses again.
  const canToggle = buckets.length > VISIBLE

  return (
    <div data-testid={`facet-${row.key}`}>
      <FacetGroup
        label={t(`search.facets.field.${row.key}`)}
        appliedCount={selected.length}
        {...(selected.length > 0 ? { onClear } : {})}
        showMore={canToggle}
        showMoreLabel={expanded ? t("search.facets.showLess") : t("search.facets.showMore")}
        expanded={expanded}
        onShowMore={() => setExpanded((v) => !v)}
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

// Organism facet variant: a Taxonomy ID text box above the bucket checkboxes,
// two-way bound to the same selection. Selecting buckets fills the box; editing
// the box (incl. minor taxIDs not in any bucket) drives the selection.
const OrganismFacetSection = ({
  row,
  selected,
  buckets,
  onSetValues,
  onToggle,
  onClear,
}: {
  row: FilterRow
  selected: readonly string[]
  buckets: readonly Bucket[]
  onSetValues: (values: string[]) => void
  onToggle: (value: string) => void
  onClear: () => void
}) => {
  const t = useT()
  const [expanded, setExpanded] = useState(false)
  const [raw, setRaw] = useState(() => selected.join(TAX_ID_SEP))
  // The box pushes its own edits to the selection, which echoes back as a new
  // `selected`; re-syncing the raw text on that echo would clobber in-progress
  // typing (a trailing comma, a half-typed id). Track what we last pushed and
  // only re-sync when the selection changes from outside (checkbox / clear /
  // URL restore).
  const lastSent = useRef<readonly string[]>(selected)
  useEffect(() => {
    if (sameValues(selected, lastSent.current)) return
    lastSent.current = selected
    setRaw(selected.join(TAX_ID_SEP))
  }, [selected])

  const onRawChange = (value: string): void => {
    setRaw(value)
    const values = parseTaxIds(value)
    lastSent.current = values
    onSetValues(values)
  }

  const shown = buckets.slice(0, expanded ? CAP : VISIBLE)
  const shownValues = new Set(shown.map((b) => b.value))
  const extras: Bucket[] = selected
    .filter((v) => !shownValues.has(v))
    .map((value) => ({ value, count: 0 }))
  const visible = [...shown, ...extras]
  const canToggle = buckets.length > VISIBLE
  const taxIdLabel = t("search.facets.organismTaxId")

  return (
    <div data-testid={`facet-${row.key}`}>
      <FacetGroup
        label={t(`search.facets.field.${row.key}`)}
        appliedCount={selected.length}
        {...(selected.length > 0 ? { onClear } : {})}
        showMore={canToggle}
        showMoreLabel={expanded ? t("search.facets.showLess") : t("search.facets.showMore")}
        expanded={expanded}
        onShowMore={() => setExpanded((v) => !v)}
      >
        <li className="flex flex-col gap-1 py-1">
          <span className="text-fs-label text-ink-mid">{taxIdLabel}</span>
          <TextInput
            ariaLabel={taxIdLabel}
            size="sm"
            mono
            value={raw}
            onChange={(e) => onRawChange(e.target.value)}
          />
        </li>
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
          grow
          value={from}
          onChange={(e) => onFromChange(e.target.value)}
        />
        <span className="text-fs-label text-ink-soft">–</span>
        <TextInput
          ariaLabel={`${label} ${t("search.facets.dateRange.toLabel")}`}
          size="sm"
          type="number"
          grow
          value={to}
          onChange={(e) => onToChange(e.target.value)}
        />
      </div>
    </div>
  )
}

export const FacetPanel = ({ state, dispatch, db, facets }: FacetPanelProps) => {
  const t = useT()
  // Anchor for resolving date presets to concrete windows (display + emit share
  // the same day, so a freshly picked preset round-trips back to itself).
  const now = new Date()
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
  return (
    <aside className="flex flex-col gap-4">
      <SidebarHeading withDivider>{t("search.facets.heading")}</SidebarHeading>
      <AppliedFilters applied={applied} onClearAll={() => dispatch({ type: "clear" })} />
      {rows.map((row) => {
        if (row.kind === "facet") {
          const selected = state.facets[row.key] ?? []
          if (row.organism) {
            return (
              <OrganismFacetSection
                key={row.key}
                row={row}
                selected={selected}
                buckets={bucketsFor(facets, row)}
                onSetValues={(values) => dispatch({ type: "setFacet", key: row.key, values })}
                onToggle={(value) => dispatch({ type: "toggleFacet", key: row.key, value })}
                onClear={() => dispatch({ type: "clearFacet", key: row.key })}
              />
            )
          }

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
          const dr = state.dateRanges[row.key] ?? EMPTY_DATE_RANGE
          // A preset shows its computed window in FROM/TO (state keeps empty
          // bounds); a custom range shows its own bounds; "all" shows nothing.
          const preset = presetRangeToDates(dr.active, now)
          const displayFrom = preset ? preset.from : dr.from
          const displayTo = preset ? preset.to : dr.to
          // Active iff a complete window is emitted (preset or both custom bounds).
          const dateActive = displayFrom !== "" && displayTo !== ""

          return (
            <DateFacet
              key={row.key}
              label={fieldLabel(row.key)}
              active={dr.active}
              appliedCount={dateActive ? 1 : 0}
              onClear={() =>
                dispatch({ type: "setDateRange", key: row.key, active: "all", from: "", to: "" })}
              onRangeChange={(next) =>
                dispatch({ type: "setDateRange", key: row.key, active: next, from: "", to: "" })}
              from={displayFrom}
              to={displayTo}
              onFromChange={(value) =>
                dispatch({
                  type: "setDateRange",
                  key: row.key,
                  active: "custom",
                  from: value,
                  to: displayTo,
                })}
              onToChange={(value) =>
                dispatch({
                  type: "setDateRange",
                  key: row.key,
                  active: "custom",
                  from: displayFrom,
                  to: value,
                })}
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
