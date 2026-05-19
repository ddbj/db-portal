import {
  findFacetMappingByDsl,
  type SidebarFieldsForDb,
} from "./sidebar-fields"
import type { SidebarState } from "./sidebar-state-types"

export type ActiveChipDescriptor =
  | {
    readonly kind: "facet" | "keyword"
    readonly id: string
    readonly labelKey: string
    readonly value: string
    readonly nextState: SidebarState
  }
  | {
    readonly kind: "date"
    readonly id: string
    readonly labelKey: string
    readonly from: string
    readonly to: string
    readonly nextState: SidebarState
  }

const removeFacetValue = (
  state: SidebarState,
  dslName: string,
  value: string,
): SidebarState => {
  const current = state.facets[dslName] ?? []
  const next = current.filter((v) => v !== value)
  const nextFacets: Record<string, readonly string[]> = {}
  for (const [k, v] of Object.entries(state.facets)) {
    if (k === dslName) {
      if (next.length > 0) nextFacets[k] = next
    } else {
      nextFacets[k] = v
    }
  }

  return { ...state, facets: nextFacets }
}

const removeKeyword = (
  state: SidebarState,
  dslName: string,
): SidebarState => {
  const nextKeywords: Record<string, string> = {}
  for (const [k, v] of Object.entries(state.keywords)) {
    if (k !== dslName) nextKeywords[k] = v
  }

  return { ...state, keywords: nextKeywords }
}

const removeDateRange = (state: SidebarState): SidebarState => ({
  ...state,
  dateRange: null,
})

export const sidebarStateToChips = (
  state: SidebarState,
  fields: SidebarFieldsForDb,
): readonly ActiveChipDescriptor[] => {
  const chips: ActiveChipDescriptor[] = []

  for (const [dslName, values] of Object.entries(state.facets)) {
    const mapping = findFacetMappingByDsl(fields, dslName)
    if (mapping === null) continue
    for (const value of values) {
      chips.push({
        kind: "facet",
        id: `facet:${dslName}:${value}`,
        labelKey: mapping.labelKey,
        value,
        nextState: removeFacetValue(state, dslName, value),
      })
    }
  }

  for (const [dslName, value] of Object.entries(state.keywords)) {
    if (value === "") continue
    const mapping = fields.keywords.find((k) => k.dslName === dslName)
    if (mapping === undefined) continue
    chips.push({
      kind: "keyword",
      id: `keyword:${dslName}`,
      labelKey: mapping.labelKey,
      value,
      nextState: removeKeyword(state, dslName),
    })
  }

  if (state.dateRange !== null) {
    const { axis, from, to } = state.dateRange
    chips.push({
      kind: "date",
      id: `date:${axis}`,
      labelKey: `routes.searchResults.sidebar.dateRange.axis.${axis}`,
      from,
      to,
      nextState: removeDateRange(state),
    })
  }

  return chips
}

export const clearAllSidebar = (state: SidebarState): SidebarState => ({
  facets: {},
  keywords: {},
  dateRange: null,
  subtype: null,
  freeText: state.freeText,
})
