import type { FacetName } from "~/lib/api"
import type { DbSlug } from "~/lib/search-scope"

// Single source of truth for search fields, shared by the Sidebar filter
// (`sidebar/facet-config.ts`) and the Advanced builder (`advanced/field-catalog.ts`).
// One field = one entry here, so the two surfaces can never drift on which field
// exists, its DSL type, whether it is facetable, or its label. The ddbj-search-api
// DSL allowlist (search/dsl/allowlist.py) stays the validation SSOT; this only
// decides what the UI offers and how it renders. See docs/search-fields.md.

// DSL field type. Drives the operator set and how each surface renders the field.
export type FieldType = "identifier" | "text" | "enum" | "date" | "number"

export type FieldDef = {
  type: FieldType
  // Present when the field has an API facet aggregation: the Sidebar renders it as
  // a facet (checkboxes) and the builder offers its buckets as combobox candidates.
  // Independent of `type` — `vendor` / `kingdom` are text-typed but facetable.
  facetName?: FacetName
  // organism taxID facet: bucket shows the scientific name, value commits the taxID.
  organism?: true
  // i18n suffix under search.fields (camelCase; field keys are snake_case).
  labelKey: string
}

// Keyed by DSL field name (snake_case), the name emitted into the AST.
export const FIELD_REGISTRY = {
  // === Tier 1 / 2 (cross + ES 6 DB) ===
  organism_id: { type: "identifier", facetName: "organism", organism: true, labelKey: "organism" },
  organism_name: { type: "text", labelKey: "organismName" },
  accessibility: { type: "enum", facetName: "accessibility", labelKey: "accessibility" },
  submitter: { type: "text", labelKey: "organization" },
  identifier: { type: "identifier", labelKey: "identifier" },
  title: { type: "text", labelKey: "title" },
  name: { type: "text", labelKey: "name" },
  description: { type: "text", labelKey: "description" },
  publication: { type: "text", labelKey: "publication" },
  date_published: { type: "date", labelKey: "datePublished" },
  date_modified: { type: "date", labelKey: "dateModified" },
  date_created: { type: "date", labelKey: "dateCreated" },
  // === Tier 3 BioProject ===
  object_type: { type: "enum", facetName: "objectType", labelKey: "objectType" },
  relevance: { type: "enum", facetName: "relevance", labelKey: "relevance" },
  project_type: { type: "text", facetName: "projectType", labelKey: "projectType" },
  grant_title: { type: "text", labelKey: "grantTitle" },
  grant_agency: { type: "text", labelKey: "grantAgency" },
  // === Tier 3 BioSample ===
  package: { type: "enum", facetName: "package", labelKey: "package" },
  model: { type: "enum", facetName: "model", labelKey: "model" },
  host: { type: "text", labelKey: "host" },
  strain: { type: "text", labelKey: "strain" },
  isolate: { type: "text", labelKey: "isolate" },
  // === Tier 3 BioSample / SRA shared ===
  geo_loc_name: { type: "text", labelKey: "geoLocName" },
  collection_date: { type: "text", labelKey: "collectionDate" },
  // === Tier 3 SRA / JGA shared (subtype identifier) ===
  type: { type: "enum", facetName: "type", labelKey: "type" },
  // === Tier 3 SRA ===
  library_strategy: { type: "enum", facetName: "libraryStrategy", labelKey: "libraryStrategy" },
  library_source: { type: "enum", facetName: "librarySource", labelKey: "librarySource" },
  library_selection: { type: "enum", facetName: "librarySelection", labelKey: "librarySelection" },
  platform: { type: "enum", facetName: "platform", labelKey: "platform" },
  library_layout: { type: "enum", facetName: "libraryLayout", labelKey: "libraryLayout" },
  instrument_model: { type: "enum", facetName: "instrumentModel", labelKey: "instrumentModel" },
  analysis_type: { type: "enum", facetName: "analysisType", labelKey: "analysisType" },
  library_name: { type: "text", labelKey: "libraryName" },
  library_construction_protocol: { type: "text", labelKey: "libraryConstructionProtocol" },
  // === Tier 3 JGA ===
  study_type: { type: "enum", facetName: "studyType", labelKey: "studyType" },
  dataset_type: { type: "enum", facetName: "datasetType", labelKey: "datasetType" },
  vendor: { type: "text", facetName: "vendor", labelKey: "vendor" },
  // === Tier 3 GEA / MetaboBank ===
  experiment_type: { type: "enum", facetName: "experimentType", labelKey: "experimentType" },
  submission_type: { type: "enum", facetName: "submissionType", labelKey: "submissionType" },
  // === Solr (ARSA / trad) ===
  division: { type: "enum", facetName: "division", labelKey: "division" },
  molecular_type: { type: "enum", facetName: "molecularType", labelKey: "molecularType" },
  feature_gene_name: { type: "text", labelKey: "featureGeneName" },
  reference_journal: { type: "text", labelKey: "referenceJournal" },
  sequence_length: { type: "number", labelKey: "sequenceLength" },
  // === Solr (TXSearch / taxonomy) ===
  rank: { type: "enum", facetName: "rank", labelKey: "rank" },
  kingdom: { type: "text", facetName: "kingdom", labelKey: "kingdom" },
  lineage: { type: "text", labelKey: "lineage" },
  phylum: { type: "text", labelKey: "phylum" },
  class: { type: "text", labelKey: "class" },
  order: { type: "text", labelKey: "order" },
  family: { type: "text", labelKey: "family" },
  genus: { type: "text", labelKey: "genus" },
  species: { type: "text", labelKey: "species" },
  common_name: { type: "text", labelKey: "commonName" },
  synonym: { type: "text", labelKey: "synonym" },
  blast_name: { type: "text", labelKey: "blastName" },
  equivalent_name: { type: "text", labelKey: "equivalentName" },
  domain: { type: "text", labelKey: "domain" },
} as const satisfies Record<string, FieldDef>

export type FieldKey = keyof typeof FIELD_REGISTRY

export type Scope = "cross" | DbSlug

// Per-scope ordered field list — the single source of "which field appears in
// which scope" for BOTH surfaces (the Sidebar renders this order; the builder
// reads the same membership). Rows read top-to-bottom as one sentence: subject
// (organism) → record identity / content → per-DB attributes → access / provenance
// metadata → dates. Fields are grouped by meaning, not render kind, so related
// fields stay adjacent (the organism taxID facet sits with its name text; the
// access / provenance block trails just above the date ranges). Solr scopes (trad /
// taxonomy) carry their own curated fields; degenerate ES fields are omitted there
// (docs/search.md § scope 別の filter 構成).
const ES_HEAD = [
  // subject: the organism taxID facet and the scientific-name text are one concept
  "organism_id",
  "organism_name",
  // record identity / content
  "identifier",
  "title",
  "name",
  "description",
] as const satisfies readonly FieldKey[]

// Access / provenance metadata, placed after the per-DB attributes and just above
// the dates: accessibility, then the submitting organization. publication and grant
// provenance append after per scope (publication is not merged for biosample; grants
// only for bioproject / jga-study).
const ES_META = ["accessibility", "submitter"] as const satisfies readonly FieldKey[]

const ES_DATES = ["date_published", "date_modified", "date_created"] as const satisfies readonly FieldKey[]

export const SCOPE_FIELDS = {
  cross: [...ES_HEAD, ...ES_META, "publication", ...ES_DATES],
  bioproject: [
    ...ES_HEAD,
    "object_type",
    "project_type",
    "relevance",
    ...ES_META,
    "publication",
    "grant_title",
    "grant_agency",
    ...ES_DATES,
  ],
  biosample: [
    ...ES_HEAD,
    "package",
    "model",
    "host",
    "strain",
    "isolate",
    "geo_loc_name",
    "collection_date",
    ...ES_META,
    ...ES_DATES,
  ],
  sra: [
    ...ES_HEAD,
    "type",
    "library_strategy",
    "library_source",
    "library_selection",
    "library_layout",
    "platform",
    "instrument_model",
    "analysis_type",
    "library_name",
    "library_construction_protocol",
    "geo_loc_name",
    "collection_date",
    ...ES_META,
    "publication",
    ...ES_DATES,
  ],
  jga: [
    ...ES_HEAD,
    "type",
    "study_type",
    "dataset_type",
    "vendor",
    ...ES_META,
    "publication",
    "grant_title",
    "grant_agency",
    ...ES_DATES,
  ],
  gea: [...ES_HEAD, "experiment_type", ...ES_META, "publication", ...ES_DATES],
  metabobank: [
    ...ES_HEAD,
    "experiment_type",
    "study_type",
    "submission_type",
    ...ES_META,
    "publication",
    ...ES_DATES,
  ],
  // Solr (ARSA): submitter degenerate, so omitted. organism_id is searchable — the API
  // resolves the taxID to a scientific name and matches the ARSA Organism/Lineage — but its
  // facet aggregation is degenerate, so it is facet-suppressed to a taxID input
  // (FACET_SUPPRESSED), sitting with its name text. publication maps to the ARSA
  // ReferenceTitle, so it is searchable here.
  trad: [
    "division",
    "molecular_type",
    "organism_id",
    "organism_name",
    "publication",
    "feature_gene_name",
    "reference_journal",
    "date_published",
    "sequence_length",
  ],
  // Solr (TXSearch): submitter / date_published degenerate, so omitted. organism_id is
  // searchable by tax_id but its facet is degenerate, so it is facet-suppressed to a
  // text input (FACET_SUPPRESSED). strain / isolate share names with biosample.
  taxonomy: [
    "rank",
    "kingdom",
    "organism_id",
    "lineage",
    "phylum",
    "class",
    "order",
    "family",
    "genus",
    "species",
    "common_name",
    "strain",
    "isolate",
    "synonym",
    "blast_name",
    "equivalent_name",
    "domain",
  ],
} as const satisfies Record<Scope, readonly FieldKey[]>

export const scopeOf = (db: DbSlug | null): Scope => db ?? "cross"

// Scopes where a field is filterable but its facet aggregation is degenerate, so it
// renders as a text/identifier input instead of facet checkboxes (the API also rejects
// the facet there). Both Solr scopes suppress organism_id: taxonomy because every
// TXSearch doc is its own organism (`facets=organism` is rejected), trad because ARSA has
// no taxID index (the API matches organism_id by resolving the taxID to a scientific name).
const FACET_SUPPRESSED: Partial<Record<Scope, readonly FieldKey[]>> = {
  trad: ["organism_id"],
  taxonomy: ["organism_id"],
}

export const isFacetSuppressed = (scope: Scope, field: FieldKey): boolean =>
  (FACET_SUPPRESSED[scope] ?? []).includes(field)
