import type { DbSlug } from "~/lib/search-scope"
import type { AdvancedOp } from "~/schemas/api-bff/llm"

// Field metadata driving the Advanced builder's field dropdown. The
// ddbj-search-api DSL allowlist (search/dsl/allowlist.py) stays the validation
// SSOT; this catalog only decides which fields and operators the builder OFFERS
// per scope. Cross fields (allowlist Tier 1/2) are valid in every scope; per-DB
// fields (Tier 3) are offered only when that DB is the active scope. Solr-backed
// trad / taxonomy Tier 3 fields are sidebar-only and intentionally omitted here.
export type FieldKind = "identifier" | "text" | "enum" | "date"

// Operators the builder offers per field kind — the UI affordance set, a subset
// of what the API allowlist (search/dsl/allowlist.py, OPERATOR_BY_KIND) accepts
// for each kind, restricted to ops that are representable in the DSL. text omits
// the redundant eq (the API folds it into contains); date stays range-only
// (between) by UI design though the API also allows an exact-date eq.
const KIND_OPS: Record<FieldKind, readonly AdvancedOp[]> = {
  identifier: ["eq", "wildcard"],
  text: ["contains", "wildcard"],
  enum: ["eq"],
  date: ["between"],
}

type FieldDef = {
  kind: FieldKind
  // "cross" = allowlist Tier 1/2 (every scope). A DB list = allowlist Tier 3,
  // offered only when one of those DBs is the active scope.
  scope: "cross" | readonly DbSlug[]
  // i18n suffix under search.builder.field (camelCase; field keys are snake_case).
  labelKey: string
}

const CATALOG = {
  // === cross (Tier 1 / Tier 2) ===
  identifier: { kind: "identifier", scope: "cross", labelKey: "identifier" },
  title: { kind: "text", scope: "cross", labelKey: "title" },
  name: { kind: "text", scope: "cross", labelKey: "name" },
  description: { kind: "text", scope: "cross", labelKey: "description" },
  organism_id: { kind: "identifier", scope: "cross", labelKey: "organismId" },
  organism_name: { kind: "text", scope: "cross", labelKey: "organismName" },
  accessibility: { kind: "enum", scope: "cross", labelKey: "accessibility" },
  date_published: { kind: "date", scope: "cross", labelKey: "datePublished" },
  date_modified: { kind: "date", scope: "cross", labelKey: "dateModified" },
  date_created: { kind: "date", scope: "cross", labelKey: "dateCreated" },
  submitter: { kind: "text", scope: "cross", labelKey: "submitter" },
  publication: { kind: "text", scope: "cross", labelKey: "publication" },
  // === Tier 3 BioProject ===
  object_type: { kind: "enum", scope: ["bioproject"], labelKey: "objectType" },
  project_type: { kind: "text", scope: ["bioproject"], labelKey: "projectType" },
  relevance: { kind: "enum", scope: ["bioproject"], labelKey: "relevance" },
  grant_title: { kind: "text", scope: ["bioproject", "jga"], labelKey: "grantTitle" },
  grant_agency: { kind: "text", scope: ["bioproject", "jga"], labelKey: "grantAgency" },
  external_link_label: { kind: "text", scope: ["bioproject", "jga"], labelKey: "externalLinkLabel" },
  // === Tier 3 BioSample ===
  host: { kind: "text", scope: ["biosample"], labelKey: "host" },
  strain: { kind: "text", scope: ["biosample"], labelKey: "strain" },
  isolate: { kind: "text", scope: ["biosample"], labelKey: "isolate" },
  package: { kind: "enum", scope: ["biosample"], labelKey: "package" },
  model: { kind: "enum", scope: ["biosample"], labelKey: "model" },
  geo_loc_name: { kind: "text", scope: ["biosample", "sra"], labelKey: "geoLocName" },
  collection_date: { kind: "text", scope: ["biosample", "sra"], labelKey: "collectionDate" },
  derived_from_id: { kind: "identifier", scope: ["biosample", "sra"], labelKey: "derivedFromId" },
  // === Tier 3 SRA ===
  library_strategy: { kind: "enum", scope: ["sra"], labelKey: "libraryStrategy" },
  library_source: { kind: "enum", scope: ["sra"], labelKey: "librarySource" },
  library_layout: { kind: "enum", scope: ["sra"], labelKey: "libraryLayout" },
  library_selection: { kind: "enum", scope: ["sra"], labelKey: "librarySelection" },
  platform: { kind: "enum", scope: ["sra"], labelKey: "platform" },
  instrument_model: { kind: "enum", scope: ["sra"], labelKey: "instrumentModel" },
  library_name: { kind: "text", scope: ["sra"], labelKey: "libraryName" },
  library_construction_protocol: {
    kind: "text",
    scope: ["sra"],
    labelKey: "libraryConstructionProtocol",
  },
  analysis_type: { kind: "enum", scope: ["sra"], labelKey: "analysisType" },
  // === Tier 3 JGA ===
  study_type: { kind: "enum", scope: ["jga", "metabobank"], labelKey: "studyType" },
  vendor: { kind: "text", scope: ["jga"], labelKey: "vendor" },
  dataset_type: { kind: "enum", scope: ["jga"], labelKey: "datasetType" },
  // === Tier 3 SRA / JGA shared (subtype identifier) ===
  type: { kind: "enum", scope: ["sra", "jga"], labelKey: "type" },
  // === Tier 3 GEA / MetaboBank ===
  experiment_type: { kind: "enum", scope: ["gea", "metabobank"], labelKey: "experimentType" },
  submission_type: { kind: "enum", scope: ["metabobank"], labelKey: "submissionType" },
} as const satisfies Record<string, FieldDef>

export type AdvancedField = keyof typeof CATALOG

const FIELD_KEYS = Object.keys(CATALOG) as AdvancedField[]

export const FIELD_OPS = Object.fromEntries(
  FIELD_KEYS.map((field) => [field, KIND_OPS[CATALOG[field].kind]]),
) as Record<AdvancedField, readonly AdvancedOp[]>

export const fieldLabelKey = (field: AdvancedField): string => CATALOG[field].labelKey

export const isDateField = (field: AdvancedField): boolean => CATALOG[field].kind === "date"

export const isAdvancedField = (value: string): value is AdvancedField =>
  Object.prototype.hasOwnProperty.call(CATALOG, value)

// Fields the builder offers when `db` is the active scope: cross fields always,
// plus the per-DB fields whose DB list includes `db`. Cross scope (db null)
// yields cross fields only.
export const fieldsForScope = (db: DbSlug | null): readonly AdvancedField[] =>
  FIELD_KEYS.filter((field) => {
    const scope: "cross" | readonly DbSlug[] = CATALOG[field].scope
    if (scope === "cross") return true

    return db !== null && scope.includes(db)
  })
