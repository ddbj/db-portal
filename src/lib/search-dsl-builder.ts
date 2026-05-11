import { nodeToDsl } from "@/lib/advanced-search/dsl"
import type {
  AdvancedConditionNode,
  AdvancedGroupNode,
  AdvancedNodeWithId,
} from "@/lib/advanced-search/types"
import type { FieldOperator, LogicOperator } from "@/types/search"

let idCounter = 0
const allocId = (prefix: string): string => `${prefix}-${++idCounter}`

const condition = (
  field: string,
  operator: FieldOperator,
  value: string | { from: string; to: string } | string[],
): AdvancedConditionNode => ({
  id: allocId("sb-c"),
  kind: "condition",
  condition: { field, operator, value },
})

const group = (
  logic: LogicOperator,
  children: AdvancedNodeWithId[],
): AdvancedGroupNode => ({
  id: allocId("sb-g"),
  kind: "group",
  logic,
  children,
})

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

export const buildFacetClause = (
  field: string,
  values: FacetSelection,
): AdvancedNodeWithId | null => {
  if (values.length === 0) return null
  const first = values[0]
  if (values.length === 1 && first !== undefined) {
    return condition(field, "equals", first)
  }

  return group("OR", values.map((v) => condition(field, "equals", v)))
}

export const buildKeywordClause = (
  field: string,
  value: string,
): AdvancedConditionNode | null => {
  const trimmed = value.trim()
  if (trimmed === "") return null

  return condition(field, "contains", trimmed)
}

export const buildDateRangeClause = (
  range: SidebarDateRange,
): AdvancedConditionNode | null => {
  if (range.from === "" && range.to === "") return null
  if (range.from !== "" && range.to !== "") {
    return condition(range.axis, "between", { from: range.from, to: range.to })
  }
  if (range.from !== "") {
    return condition(range.axis, "gte", range.from)
  }

  return condition(range.axis, "lte", range.to)
}

export const sidebarStateToTree = (
  state: SidebarState,
): AdvancedGroupNode | null => {
  const clauses: AdvancedNodeWithId[] = []

  for (const [field, values] of Object.entries(state.facets)) {
    const c = buildFacetClause(field, values)
    if (c !== null) clauses.push(c)
  }
  for (const [field, value] of Object.entries(state.keywords)) {
    const c = buildKeywordClause(field, value)
    if (c !== null) clauses.push(c)
  }
  if (state.dateRange !== null) {
    const c = buildDateRangeClause(state.dateRange)
    if (c !== null) clauses.push(c)
  }
  if (state.subtype !== null && state.subtype !== "") {
    clauses.push(condition("type", "equals", state.subtype))
  }

  if (clauses.length === 0) return null

  return group("AND", clauses)
}

export const sidebarStateToDsl = (state: SidebarState): string | null => {
  const tree = sidebarStateToTree(state)
  if (tree === null) return null

  return nodeToDsl(tree)
}

export const mergeAdvWithSidebar = (
  existingAdv: string | null,
  sidebarDsl: string | null,
): string | null => {
  if (existingAdv === null && sidebarDsl === null) return null
  if (existingAdv === null) return sidebarDsl
  if (sidebarDsl === null) return existingAdv

  return `(${existingAdv}) AND (${sidebarDsl})`
}
