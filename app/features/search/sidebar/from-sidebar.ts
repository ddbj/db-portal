import type { ParseNode } from "~/lib/api"
import type { DateRangeKey } from "~/ui"

import { canonicalizeAst } from "../ast/canonicalize"
import { identityAst } from "../ast/identity"
import { mergeAstAnd } from "../ast/merge"
import type { DbSlug } from "../types"
import type { DatePublishedFilter, FacetState } from "./facet-state"

const SUBMITTER_FIELD = "organization_name"
const STUDY_TYPE_FIELD = "library_strategy"
const ORGANISM_FIELD = "organism"
const DATE_PUBLISHED_FIELD = "date_published"

export type FromSidebarOptions = {
  db?: DbSlug | null
}

const presetRangeToDates = (key: DateRangeKey, today: Date): { from: string; to: string } | null => {
  if (key === "all") return null
  const to = today.toISOString().slice(0, 10)
  const fromDate = new Date(today)
  switch (key) {
    case "1y":
      fromDate.setFullYear(today.getFullYear() - 1)
      break
    case "5y":
      fromDate.setFullYear(today.getFullYear() - 5)
      break
    case "10y":
      fromDate.setFullYear(today.getFullYear() - 10)
      break
  }
  const from = fromDate.toISOString().slice(0, 10)

  return { from, to }
}

const dateRangeToAst = (filter: DatePublishedFilter, now: Date): ParseNode | null => {
  if (filter.active !== "all") {
    const preset = presetRangeToDates(filter.active, now)
    if (preset) {
      return { op: "between", field: DATE_PUBLISHED_FIELD, from: preset.from, to: preset.to }
    }
  }
  if (filter.from !== "" && filter.to !== "") {
    return { op: "between", field: DATE_PUBLISHED_FIELD, from: filter.from, to: filter.to }
  }

  return null
}

const organismToAst = (organisms: readonly string[]): ParseNode | null => {
  if (organisms.length === 0) return null
  if (organisms.length === 1) {
    const [only] = organisms

    return only ? { op: "eq", field: ORGANISM_FIELD, value: only } : null
  }
  const rules: ParseNode[] = organisms.map((value) => ({
    op: "eq" as const,
    field: ORGANISM_FIELD,
    value,
  }))

  return { op: "OR", rules }
}

const submittersToAst = (submitters: readonly string[]): ParseNode | null => {
  if (submitters.length === 0) return null
  if (submitters.length === 1) {
    const [only] = submitters

    return only ? { op: "eq", field: SUBMITTER_FIELD, value: only } : null
  }
  const rules: ParseNode[] = submitters.map((value) => ({
    op: "eq" as const,
    field: SUBMITTER_FIELD,
    value,
  }))

  return { op: "OR", rules }
}

const studyTypeToAst = (value: string | null): ParseNode | null => {
  if (!value) return null

  return { op: "eq", field: STUDY_TYPE_FIELD, value }
}

export const fromSidebar = (
  state: FacetState,
  options: FromSidebarOptions = {},
  now: Date = new Date(),
): ParseNode => {
  const includeDbOnly = options.db !== null && options.db !== undefined
  const parts: ParseNode[] = []
  const organism = organismToAst(state.organisms)
  if (organism) parts.push(organism)
  if (includeDbOnly) {
    const submitter = submittersToAst(state.submitters)
    if (submitter) parts.push(submitter)
    const studyType = studyTypeToAst(state.studyType)
    if (studyType) parts.push(studyType)
  }
  const dateRange = dateRangeToAst(state.datePublished, now)
  if (dateRange) parts.push(dateRange)
  if (parts.length === 0) return identityAst

  return canonicalizeAst(mergeAstAnd(...parts))
}
