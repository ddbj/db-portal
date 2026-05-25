import type { ParseNode } from "~/lib/api"

import { identityAst } from "../ast/identity"
import { mergeAstAnd } from "../ast/merge"
import { createInitialSearchFacetState, type SearchFacetState } from "./facet-state"

const ORGANISM_FIELD = "organism"
const SUBMITTER_FIELD = "organization_name"
const STUDY_TYPE_FIELD = "library_strategy"
const DATE_PUBLISHED_FIELD = "date_published"

const isOrganismLeaf = (node: ParseNode): boolean =>
  node.op === "eq" && node.field === ORGANISM_FIELD

const isSubmitterLeaf = (node: ParseNode): boolean =>
  node.op === "eq" && node.field === SUBMITTER_FIELD

const isStudyTypeLeaf = (node: ParseNode): boolean =>
  node.op === "eq" && node.field === STUDY_TYPE_FIELD

const isDateRange = (node: ParseNode): boolean =>
  node.op === "between" && node.field === DATE_PUBLISHED_FIELD

const collectOrOfFieldValues = (node: ParseNode, field: string): string[] | null => {
  if (node.op !== "OR") return null
  const values: string[] = []
  for (const rule of node.rules) {
    if (rule.op === "eq" && rule.field === field) {
      values.push(rule.value)
    } else {
      return null
    }
  }

  return values
}

type SplitClassification = {
  organisms: string[]
  submitters: string[]
  studyType: string | null
  dateRange: { from: string; to: string } | null
}

const initialClassification = (): SplitClassification => ({
  organisms: [],
  submitters: [],
  studyType: null,
  dateRange: null,
})

const tryClassify = (node: ParseNode, classification: SplitClassification): boolean => {
  if (node.op === "eq") {
    if (isOrganismLeaf(node)) {
      classification.organisms.push(node.value)

      return true
    }
    if (isSubmitterLeaf(node)) {
      classification.submitters.push(node.value)

      return true
    }
    if (isStudyTypeLeaf(node) && classification.studyType === null) {
      classification.studyType = node.value

      return true
    }
  }
  if (isDateRange(node) && classification.dateRange === null) {
    if (node.op === "between") {
      classification.dateRange = { from: node.from, to: node.to }

      return true
    }
  }
  const organismValues = collectOrOfFieldValues(node, ORGANISM_FIELD)
  if (organismValues) {
    classification.organisms.push(...organismValues)

    return true
  }
  const submitterValues = collectOrOfFieldValues(node, SUBMITTER_FIELD)
  if (submitterValues) {
    classification.submitters.push(...submitterValues)

    return true
  }

  return false
}

export type SplitResult = {
  sidebar: SearchFacetState
  rest: ParseNode
}

export const splitForSidebar = (ast: ParseNode): SplitResult => {
  const classification = initialClassification()
  const remaining: ParseNode[] = []
  if (ast.op === "AND") {
    for (const child of ast.rules) {
      if (!tryClassify(child, classification)) remaining.push(child)
    }
  } else if (!tryClassify(ast, classification)) {
    remaining.push(ast)
  }

  const sidebar: SearchFacetState = createInitialSearchFacetState()
  sidebar.organisms = classification.organisms
  sidebar.submitters = classification.submitters
  sidebar.studyType = classification.studyType
  if (classification.dateRange) {
    sidebar.datePublished = {
      active: "all",
      from: classification.dateRange.from,
      to: classification.dateRange.to,
    }
  }
  const rest = remaining.length === 0 ? identityAst : mergeAstAnd(...remaining)

  return { sidebar, rest }
}
