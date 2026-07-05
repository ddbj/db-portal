import type { DateRangeKey } from "~/ui"

export type DateRangeFilter = {
  active: DateRangeKey
  from: string
  to: string
}

type NumberRange = {
  from: string
  to: string
}

export const EMPTY_DATE_RANGE: DateRangeFilter = { active: "all", from: "", to: "" }

// Generic, scope-agnostic sidebar state. Rows are keyed by their FilterRow.key
// (facet-config.ts); the scope decides which keys are rendered/emitted.
export type SearchFacetState = {
  // facet selections (multi): row key → selected values
  facets: Record<string, string[]>
  // free-text inputs: row key → value
  texts: Record<string, string>
  // date range rows (date_published / date_modified / date_created): row key →
  // preset (all / 1y / 5y / 10y) or "custom" + FROM/TO. Each dateRange row has its own slot.
  dateRanges: Record<string, DateRangeFilter>
  // numeric ranges (e.g. sequence_length): row key → { from, to }
  ranges: Record<string, NumberRange>
}

export type SearchFacetAction =
  | { type: "toggleFacet"; key: string; value: string }
  | { type: "setFacet"; key: string; values: string[] }
  | { type: "clearFacet"; key: string }
  | { type: "setText"; key: string; value: string }
  | { type: "setDateRange"; key: string; active: DateRangeKey; from: string; to: string }
  | { type: "setRangeFrom"; key: string; value: string }
  | { type: "setRangeTo"; key: string; value: string }
  | { type: "clear" }
  | { type: "replace"; state: SearchFacetState }

export const createInitialSearchFacetState = (): SearchFacetState => ({
  facets: {},
  texts: {},
  dateRanges: {},
  ranges: {},
})

const toggle = (values: readonly string[] | undefined, value: string): string[] => {
  const current = values ?? []
  const idx = current.indexOf(value)
  if (idx === -1) return [...current, value]
  const next = [...current]
  next.splice(idx, 1)

  return next
}

const setRange = (
  ranges: Record<string, NumberRange>,
  key: string,
  patch: Partial<NumberRange>,
): Record<string, NumberRange> => {
  const current = ranges[key] ?? { from: "", to: "" }

  return { ...ranges, [key]: { ...current, ...patch } }
}

const setDate = (
  dateRanges: Record<string, DateRangeFilter>,
  key: string,
  patch: Partial<DateRangeFilter>,
): Record<string, DateRangeFilter> => {
  const current = dateRanges[key] ?? EMPTY_DATE_RANGE

  return { ...dateRanges, [key]: { ...current, ...patch } }
}

export const searchFacetReducer = (
  state: SearchFacetState,
  action: SearchFacetAction,
): SearchFacetState => {
  switch (action.type) {
    case "toggleFacet":
      return {
        ...state,
        facets: { ...state.facets, [action.key]: toggle(state.facets[action.key], action.value) },
      }
    case "setFacet":
      return { ...state, facets: { ...state.facets, [action.key]: action.values } }
    case "clearFacet":
      return { ...state, facets: { ...state.facets, [action.key]: [] } }
    case "setText":
      return { ...state, texts: { ...state.texts, [action.key]: action.value } }
    case "setDateRange":
      // The caller resolves the (active, from, to) triple: a preset carries
      // empty bounds (recomputed at emit), "all" clears, "custom" carries the
      // edited bounds. The reducer just stores the resolved slot.
      return {
        ...state,
        dateRanges: setDate(state.dateRanges, action.key, {
          active: action.active,
          from: action.from,
          to: action.to,
        }),
      }
    case "setRangeFrom":
      return { ...state, ranges: setRange(state.ranges, action.key, { from: action.value }) }
    case "setRangeTo":
      return { ...state, ranges: setRange(state.ranges, action.key, { to: action.value }) }
    case "clear":
      return createInitialSearchFacetState()
    case "replace":
      return action.state
  }
}
