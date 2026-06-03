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

type Scope = "cross" | DbSlug

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
// Free-text search on organism.name, paired with the taxID organism facet so a
// name-based DSL (organism_name:...) round-trips into the sidebar instead of
// falling through to the Advanced builder.
const organismName = text("organismName", "organism_name")
// organization.name (nested text) を絞り込む行。DSL field 名は API allowlist の submitter。
const organization = text("organization", "submitter")
// Tier 1 identity / text fields. identifier は keyword exact (op eq)、title / description は
// keyword box 既定 field と同じ analyzed match (contains)。全 ES scope + cross に出る。
const identifier = text("identifier", "identifier", "eq")
const title = text("title", "title")
const description = text("description", "description")
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
// Common ES fields surfaced in every ES scope's sidebar. accessibility is a
// 2-value enum facet (API _COMMON_FACET); name / publication are free-text rows.
// publication is omitted where the field is not merged (biosample) and on Solr scopes.
const accessibility = facet("accessibility", "accessibility", "accessibility")
const name = text("name", "name")
const publication = text("publication", "publication")
const dateModified: FilterRow = {
  key: "dateModified",
  kind: "dateRange",
  dslField: "date_modified",
  op: "between",
}
const dateCreated: FilterRow = {
  key: "dateCreated",
  kind: "dateRange",
  dslField: "date_created",
  op: "between",
}
// ES scopes expose all three date ranges; Solr (trad) keeps only date_published.
const esDateRanges: readonly FilterRow[] = [datePublished, dateModified, dateCreated]

// Common Tier 1/2 rows shared by cross and every ES scope (identity / text +
// the organism facet + accessibility). publication is appended per scope since
// it is not merged into biosample; Solr scopes (trad / taxonomy) keep their own
// curated rows and do not reuse this head.
const esCommonHead: readonly FilterRow[] = [
  organism,
  organismName,
  accessibility,
  organization,
  identifier,
  title,
  name,
  description,
]

export const SCOPE_FILTERS: Record<Scope, readonly FilterRow[]> = {
  cross: [...esCommonHead, publication, ...esDateRanges],
  bioproject: [
    ...esCommonHead,
    publication,
    facet("objectType", "object_type", "objectType"),
    facet("relevance", "relevance", "relevance"),
    text("projectType", "project_type"),
    text("grantTitle", "grant_title"),
    text("grantAgency", "grant_agency"),
    text("externalLinkLabel", "external_link_label"),
    ...esDateRanges,
  ],
  // biosample omits publication: the publication.title nested field is not merged
  // there, so the API rejects publication for db=biosample (422).
  biosample: [
    ...esCommonHead,
    facet("package", "package", "package"),
    facet("model", "model", "model"),
    text("host", "host"),
    text("strain", "strain"),
    text("isolate", "isolate"),
    text("geoLocName", "geo_loc_name"),
    text("collectionDate", "collection_date"),
    text("derivedFromId", "derived_from_id", "eq"),
    ...esDateRanges,
  ],
  sra: [
    ...esCommonHead,
    publication,
    facet("type", "type", "type"),
    facet("libraryStrategy", "library_strategy", "libraryStrategy"),
    facet("librarySource", "library_source", "librarySource"),
    facet("librarySelection", "library_selection", "librarySelection"),
    facet("platform", "platform", "platform"),
    facet("libraryLayout", "library_layout", "libraryLayout"),
    facet("instrumentModel", "instrument_model", "instrumentModel"),
    facet("analysisType", "analysis_type", "analysisType"),
    text("libraryName", "library_name"),
    text("libraryConstructionProtocol", "library_construction_protocol"),
    text("geoLocName", "geo_loc_name"),
    text("collectionDate", "collection_date"),
    text("derivedFromId", "derived_from_id", "eq"),
    ...esDateRanges,
  ],
  jga: [
    ...esCommonHead,
    publication,
    facet("type", "type", "type"),
    facet("studyType", "study_type", "studyType"),
    facet("datasetType", "dataset_type", "datasetType"),
    facet("vendor", "vendor", "vendor", "contains"),
    text("grantTitle", "grant_title"),
    text("grantAgency", "grant_agency"),
    text("externalLinkLabel", "external_link_label"),
    ...esDateRanges,
  ],
  gea: [
    ...esCommonHead,
    publication,
    facet("experimentType", "experiment_type", "experimentType"),
    ...esDateRanges,
  ],
  metabobank: [
    ...esCommonHead,
    publication,
    facet("experimentType", "experiment_type", "experimentType"),
    facet("studyType", "study_type", "studyType"),
    facet("submissionType", "submission_type", "submissionType"),
    ...esDateRanges,
  ],
  // Solr (ARSA): organism_id / submitter degenerate, so omitted.
  trad: [
    facet("division", "division", "division"),
    facet("molecularType", "molecular_type", "molecularType"),
    organismName,
    text("featureGeneName", "feature_gene_name"),
    text("referenceJournal", "reference_journal"),
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

const scopeOf = (db: DbSlug | null): Scope => db ?? "cross"

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
