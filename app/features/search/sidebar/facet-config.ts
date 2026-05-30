import type { FacetName } from "~/lib/api"

import type { DbSlug } from "../types"

// Sidebar filter rows per scope (cross + each DB). This is the code SSOT for
// docs/search.md § Sidebar facet: which fields appear, how they render, the
// DbPortalFacets key to read counts from, and the DSL field/operator emitted
// into the AST. The API decides the facet candidate values; this only decides
// presentation and AST mapping.

export type FilterRowKind = "facet" | "text" | "dateRange" | "numberRange"

// AST leaf operator the row emits. enum/identifier → eq, text → contains,
// date/number → between (mirrors ddbj-search-api allowlist operator matrix).
export type FilterOp = "eq" | "contains" | "between"

export type FilterRow = {
  // Stable key within a scope; also the i18n label key under search.facets.field.
  key: string
  kind: FilterRowKind
  // DSL field name emitted into the AST.
  dslField: string
  op: FilterOp
  // DbPortalFacets key + `facets` request name. Present only for kind "facet".
  facetName?: FacetName
  // organism facet displays the bucket `label` (scientific name) instead of value.
  organism?: boolean
}

export type Scope = "cross" | DbSlug

const facet = (
  key: string,
  dslField: string,
  facetName: FacetName,
  op: FilterOp = "eq",
): FilterRow => ({ key, kind: "facet", dslField, op, facetName })

const text = (key: string, dslField: string, op: FilterOp = "contains"): FilterRow => ({
  key,
  kind: "text",
  dslField,
  op,
})

const organism: FilterRow = {
  key: "organism",
  kind: "facet",
  dslField: "organism_id",
  op: "eq",
  facetName: "organism",
  organism: true,
}
const submitter = text("submitter", "submitter")
const datePublished: FilterRow = {
  key: "datePublished",
  kind: "dateRange",
  dslField: "date_published",
  op: "between",
}
const sequenceLength: FilterRow = {
  key: "sequenceLength",
  kind: "numberRange",
  dslField: "sequence_length",
  op: "between",
}

export const SCOPE_FILTERS: Record<Scope, readonly FilterRow[]> = {
  cross: [organism, datePublished],
  bioproject: [
    organism,
    facet("objectType", "object_type", "objectType"),
    facet("relevance", "relevance", "relevance"),
    submitter,
    text("projectType", "project_type"),
    text("grantTitle", "grant_title"),
    text("grantAgency", "grant_agency"),
    text("externalLinkLabel", "external_link_label"),
    datePublished,
  ],
  biosample: [
    organism,
    facet("package", "package", "package"),
    facet("model", "model", "model"),
    submitter,
    text("host", "host"),
    text("strain", "strain"),
    text("isolate", "isolate"),
    text("geoLocName", "geo_loc_name"),
    text("collectionDate", "collection_date"),
    text("derivedFromId", "derived_from_id", "eq"),
    datePublished,
  ],
  sra: [
    organism,
    facet("libraryStrategy", "library_strategy", "libraryStrategy"),
    facet("librarySource", "library_source", "librarySource"),
    facet("librarySelection", "library_selection", "librarySelection"),
    facet("platform", "platform", "platform"),
    facet("libraryLayout", "library_layout", "libraryLayout"),
    facet("instrumentModel", "instrument_model", "instrumentModel", "contains"),
    facet("analysisType", "analysis_type", "analysisType", "contains"),
    submitter,
    text("libraryName", "library_name"),
    text("libraryConstructionProtocol", "library_construction_protocol"),
    text("geoLocName", "geo_loc_name"),
    text("collectionDate", "collection_date"),
    text("derivedFromId", "derived_from_id", "eq"),
    datePublished,
  ],
  jga: [
    organism,
    facet("studyType", "study_type", "studyType"),
    facet("datasetType", "dataset_type", "datasetType", "contains"),
    facet("vendor", "vendor", "vendor", "contains"),
    submitter,
    text("grantTitle", "grant_title"),
    text("grantAgency", "grant_agency"),
    text("externalLinkLabel", "external_link_label"),
    datePublished,
  ],
  gea: [
    organism,
    facet("experimentType", "experiment_type", "experimentType", "contains"),
    submitter,
    datePublished,
  ],
  metabobank: [
    organism,
    facet("experimentType", "experiment_type", "experimentType", "contains"),
    facet("studyType", "study_type", "studyType"),
    facet("submissionType", "submission_type", "submissionType", "contains"),
    submitter,
    datePublished,
  ],
  // Solr (ARSA): organism_id / submitter degenerate, so omitted.
  trad: [
    facet("division", "division", "division"),
    facet("molecularType", "molecular_type", "molecularType"),
    text("featureGeneName", "feature_gene_name"),
    text("referenceJournal", "reference_journal"),
    text("organismName", "organism_name"),
    datePublished,
    sequenceLength,
  ],
  // Solr (TXSearch): organism facet degenerate (tax_id is doc identity),
  // submitter / date_published degenerate, so omitted.
  taxonomy: [
    facet("rank", "rank", "rank"),
    facet("kingdom", "kingdom", "kingdom", "contains"),
    text("lineage", "lineage"),
    text("phylum", "phylum"),
    text("class", "class"),
    text("order", "order"),
    text("family", "family"),
    text("genus", "genus"),
    text("species", "species"),
    text("commonName", "common_name"),
  ],
}

export const scopeOf = (db: DbSlug | null): Scope => db ?? "cross"

export const scopeFilters = (db: DbSlug | null): readonly FilterRow[] =>
  SCOPE_FILTERS[scopeOf(db)]

// Comma-separated `facets` request param for a scope (the facet rows' API names).
// Empty string when the scope has no facet rows (caller omits the param).
export const scopeFacetParam = (db: DbSlug | null): string =>
  scopeFilters(db)
    .filter((row) => row.kind === "facet")
    .map((row) => row.facetName)
    .join(",")

// dslField → row lookup for a scope (used to route AST leaves back to rows).
export const rowByDslField = (db: DbSlug | null): Map<string, FilterRow> => {
  const map = new Map<string, FilterRow>()
  for (const row of scopeFilters(db)) map.set(row.dslField, row)

  return map
}
