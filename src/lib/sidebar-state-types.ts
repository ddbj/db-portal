export type FacetSelection = readonly string[]

export type SidebarFacetsState = Readonly<Record<string, FacetSelection>>
export type SidebarKeywordsState = Readonly<Record<string, string>>

export type DateAxis = "date_published" | "date_modified" | "date_created"

export interface SidebarDateRange {
  readonly axis: DateAxis
  readonly from: string
  readonly to: string
}

export interface SidebarState {
  readonly facets: SidebarFacetsState
  readonly keywords: SidebarKeywordsState
  readonly dateRange: SidebarDateRange | null
  readonly subtype: string | null
}

export const EMPTY_SIDEBAR_STATE: SidebarState = {
  facets: {},
  keywords: {},
  dateRange: null,
  subtype: null,
}
