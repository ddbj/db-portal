import type { DateRangeKey } from "~/ui"

export type DatePublishedFilter = {
  active: DateRangeKey
  from: string
  to: string
}

export type NumberRange = {
  from: string
  to: string
}

// Generic, scope-agnostic sidebar state. Rows are keyed by their FilterRow.key
// (facet-config.ts); the scope decides which keys are rendered/emitted.
export type SearchFacetState = {
  // facet selections (multi): row key → selected values
  facets: Record<string, string[]>
  // free-text inputs: row key → value
  texts: Record<string, string>
  // datePublished has a dedicated preset UI (all / 1y / 5y / 10y + FROM/TO)
  datePublished: DatePublishedFilter
  // numeric ranges (e.g. sequence_length): row key → { from, to }
  ranges: Record<string, NumberRange>
}

export type SearchFacetAction =
  | { type: "toggleFacet"; key: string; value: string }
  | { type: "clearFacet"; key: string }
  | { type: "setText"; key: string; value: string }
  | { type: "setDateRange"; active: DateRangeKey }
  | { type: "setDateFrom"; value: string }
  | { type: "setDateTo"; value: string }
  | { type: "setRangeFrom"; key: string; value: string }
  | { type: "setRangeTo"; key: string; value: string }
  | { type: "clear" }
  | { type: "replace"; state: SearchFacetState }

export const createInitialSearchFacetState = (): SearchFacetState => ({
  facets: {},
  texts: {},
  datePublished: { active: "all", from: "", to: "" },
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
    case "clearFacet":
      return { ...state, facets: { ...state.facets, [action.key]: [] } }
    case "setText":
      return { ...state, texts: { ...state.texts, [action.key]: action.value } }
    case "setDateRange":
      return {
        ...state,
        datePublished: {
          active: action.active,
          from: action.active === "all" ? "" : state.datePublished.from,
          to: action.active === "all" ? "" : state.datePublished.to,
        },
      }
    case "setDateFrom":
      return {
        ...state,
        datePublished: { ...state.datePublished, active: "all", from: action.value },
      }
    case "setDateTo":
      return {
        ...state,
        datePublished: { ...state.datePublished, active: "all", to: action.value },
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
