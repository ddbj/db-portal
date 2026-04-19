import type { DbHitCount, DbId } from "./db"

export interface RelatedObject {
  dbId: DbId
  identifier: string
  url?: string
}

export interface SearchResultBase {
  identifier: string
  publishedAt: string | null
  title: string
  description?: string
  organism?: { name: string; taxonomyId?: number }
  externalUrl: string
  relatedObjects?: RelatedObject[]
}

export interface BioProjectMeta {
  dbId: "bioproject"
  projectType?: string
  organization?: string
}

export interface TradMeta {
  dbId: "trad"
  division?: string
}

export interface TaxonomyMeta {
  dbId: "taxonomy"
  rank?: string
  commonName?: string
  japaneseName?: string
}

export interface NoExtraMeta {
  dbId: "biosample" | "sra" | "jga" | "gea" | "metabobank"
}

export type SearchResult =
  & SearchResultBase
  & (BioProjectMeta | TradMeta | TaxonomyMeta | NoExtraMeta)

export interface CrossSearchSummary {
  query: string
  databases: DbHitCount[]
  isPartialFailure: boolean
}

export type FieldOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "starts_with"
  | "wildcard"
  | "between"
  | "gte"
  | "lte"

export type LogicOperator = "AND" | "OR" | "NOT"

export type AdvancedFieldType =
  | "identifier"
  | "text"
  | "organism"
  | "date"
  | "number"
  | "enum"

export interface AdvancedCondition {
  field: string
  operator: FieldOperator
  value: string | { from: string; to: string } | string[]
}

export type AdvancedNode =
  | { kind: "condition"; condition: AdvancedCondition }
  | { kind: "group"; logic: LogicOperator; children: AdvancedNode[] }
