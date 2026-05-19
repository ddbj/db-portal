import type { DateAxis } from "@/lib/sidebar-state-types"
import type { DbId } from "@/types/db"

export interface FacetFieldMapping {
  readonly facetKey: string
  readonly dslName: string
  readonly labelKey: string
}

export interface KeywordFieldMapping {
  readonly dslName: string
  readonly labelKey: string
}

export interface SidebarSubtypeAdditional {
  readonly facets?: readonly FacetFieldMapping[]
  readonly keywords?: readonly KeywordFieldMapping[]
}

export interface SidebarFieldsForDb {
  readonly facets: readonly FacetFieldMapping[]
  readonly keywords: readonly KeywordFieldMapping[]
  readonly dateAxes: readonly DateAxis[]
  readonly subtype: boolean
  readonly subtypeAdditional?: Readonly<Record<string, SidebarSubtypeAdditional>>
}

const DEFAULT_DATE_AXES: readonly DateAxis[] = [
  "date_published",
  "date_modified",
  "date_created",
]

const advancedFieldLabel = (id: string): string =>
  `routes.search.fields.${id}.label`

const sidebarFieldLabel = (dslName: string): string =>
  `routes.searchResults.sidebar.fields.${dslName}.label`

export const SIDEBAR_FIELDS_BY_DB: Readonly<Record<DbId, SidebarFieldsForDb>> = {
  bioproject: {
    facets: [
      { facetKey: "organism", dslName: "organism", labelKey: advancedFieldLabel("organism") },
      { facetKey: "accessibility", dslName: "accessibility", labelKey: sidebarFieldLabel("accessibility") },
      { facetKey: "objectType", dslName: "project_type", labelKey: advancedFieldLabel("project_type") },
      { facetKey: "relevance", dslName: "relevance", labelKey: advancedFieldLabel("relevance") },
    ],
    keywords: [
      { dslName: "grant_agency", labelKey: advancedFieldLabel("bioproject_grant_agency") },
    ],
    dateAxes: DEFAULT_DATE_AXES,
    subtype: false,
  },
  biosample: {
    facets: [
      { facetKey: "organism", dslName: "organism", labelKey: advancedFieldLabel("organism") },
      { facetKey: "accessibility", dslName: "accessibility", labelKey: sidebarFieldLabel("accessibility") },
      { facetKey: "package", dslName: "package", labelKey: sidebarFieldLabel("package") },
      { facetKey: "model", dslName: "model", labelKey: sidebarFieldLabel("model") },
    ],
    keywords: [
      { dslName: "host", labelKey: advancedFieldLabel("host") },
      { dslName: "strain", labelKey: advancedFieldLabel("strain") },
      { dslName: "isolate", labelKey: advancedFieldLabel("isolate") },
      { dslName: "geo_loc_name", labelKey: advancedFieldLabel("geo_loc_name") },
      { dslName: "collection_date", labelKey: advancedFieldLabel("collection_date") },
    ],
    dateAxes: DEFAULT_DATE_AXES,
    subtype: false,
  },
  sra: {
    facets: [
      { facetKey: "organism", dslName: "organism", labelKey: advancedFieldLabel("organism") },
      { facetKey: "accessibility", dslName: "accessibility", labelKey: sidebarFieldLabel("accessibility") },
    ],
    keywords: [],
    dateAxes: DEFAULT_DATE_AXES,
    subtype: true,
    subtypeAdditional: {
      "sra-experiment": {
        facets: [
          { facetKey: "libraryStrategy", dslName: "library_strategy", labelKey: advancedFieldLabel("library_strategy") },
          { facetKey: "librarySource", dslName: "library_source", labelKey: advancedFieldLabel("library_source") },
          { facetKey: "librarySelection", dslName: "library_selection", labelKey: sidebarFieldLabel("library_selection") },
          { facetKey: "libraryLayout", dslName: "library_layout", labelKey: advancedFieldLabel("library_layout") },
          { facetKey: "platform", dslName: "platform", labelKey: advancedFieldLabel("platform") },
          { facetKey: "instrumentModel", dslName: "instrument_model", labelKey: advancedFieldLabel("instrument_model") },
        ],
        keywords: [
          { dslName: "library_name", labelKey: advancedFieldLabel("library_name") },
          { dslName: "library_construction_protocol", labelKey: advancedFieldLabel("library_construction_protocol") },
        ],
      },
      "sra-sample": {
        keywords: [
          { dslName: "geo_loc_name", labelKey: advancedFieldLabel("geo_loc_name") },
          { dslName: "collection_date", labelKey: advancedFieldLabel("collection_date") },
        ],
      },
      "sra-analysis": {
        facets: [
          { facetKey: "analysisType", dslName: "analysis_type", labelKey: advancedFieldLabel("analysis_type") },
        ],
      },
    },
  },
  jga: {
    facets: [
      { facetKey: "organism", dslName: "organism", labelKey: advancedFieldLabel("organism") },
      { facetKey: "accessibility", dslName: "accessibility", labelKey: sidebarFieldLabel("accessibility") },
    ],
    keywords: [
      { dslName: "grant_agency", labelKey: advancedFieldLabel("jga_grant_agency") },
    ],
    dateAxes: DEFAULT_DATE_AXES,
    subtype: true,
    subtypeAdditional: {
      "jga-study": {
        facets: [
          { facetKey: "studyType", dslName: "study_type", labelKey: advancedFieldLabel("jga_study_type") },
        ],
      },
      "jga-dataset": {
        facets: [
          { facetKey: "datasetType", dslName: "dataset_type", labelKey: advancedFieldLabel("dataset_type") },
        ],
        keywords: [
          { dslName: "vendor", labelKey: advancedFieldLabel("vendor") },
        ],
      },
    },
  },
  gea: {
    facets: [
      { facetKey: "organism", dslName: "organism", labelKey: advancedFieldLabel("organism") },
      { facetKey: "accessibility", dslName: "accessibility", labelKey: sidebarFieldLabel("accessibility") },
      { facetKey: "experimentType", dslName: "experiment_type", labelKey: advancedFieldLabel("gea_experiment_type") },
    ],
    keywords: [],
    dateAxes: DEFAULT_DATE_AXES,
    subtype: false,
  },
  metabobank: {
    facets: [
      { facetKey: "organism", dslName: "organism", labelKey: advancedFieldLabel("organism") },
      { facetKey: "accessibility", dslName: "accessibility", labelKey: sidebarFieldLabel("accessibility") },
      { facetKey: "studyType", dslName: "study_type", labelKey: advancedFieldLabel("metabobank_study_type") },
      { facetKey: "experimentType", dslName: "experiment_type", labelKey: advancedFieldLabel("metabobank_experiment_type") },
      { facetKey: "submissionType", dslName: "submission_type", labelKey: advancedFieldLabel("submission_type") },
    ],
    keywords: [],
    dateAxes: DEFAULT_DATE_AXES,
    subtype: false,
  },
  trad: {
    facets: [],
    keywords: [
      { dslName: "feature_gene_name", labelKey: advancedFieldLabel("feature_gene_name") },
      { dslName: "reference_journal", labelKey: advancedFieldLabel("reference_journal") },
    ],
    dateAxes: DEFAULT_DATE_AXES,
    subtype: false,
  },
  taxonomy: {
    facets: [],
    keywords: [
      { dslName: "lineage", labelKey: advancedFieldLabel("lineage") },
      { dslName: "kingdom", labelKey: advancedFieldLabel("kingdom") },
      { dslName: "phylum", labelKey: advancedFieldLabel("phylum") },
      { dslName: "class", labelKey: advancedFieldLabel("class") },
      { dslName: "order", labelKey: advancedFieldLabel("order") },
      { dslName: "family", labelKey: advancedFieldLabel("family") },
      { dslName: "genus", labelKey: advancedFieldLabel("genus") },
      { dslName: "species", labelKey: advancedFieldLabel("species") },
      { dslName: "common_name", labelKey: advancedFieldLabel("common_name") },
    ],
    dateAxes: [],
    subtype: false,
  },
}

const mergeAdditional = (
  base: SidebarFieldsForDb,
  add: SidebarSubtypeAdditional,
): SidebarFieldsForDb => ({
  ...base,
  facets: [...base.facets, ...(add.facets ?? [])],
  keywords: [...base.keywords, ...(add.keywords ?? [])],
})

export const sidebarFieldsForDb = (
  db: DbId,
  subtype: string | null,
): SidebarFieldsForDb => {
  const base = SIDEBAR_FIELDS_BY_DB[db]
  if (subtype === null || base.subtypeAdditional === undefined) return base
  const add = base.subtypeAdditional[subtype]
  if (add === undefined) return base

  return mergeAdditional(base, add)
}

export const findFacetMappingByDsl = (
  fields: SidebarFieldsForDb,
  dslName: string,
): FacetFieldMapping | null => {
  for (const f of fields.facets) {
    if (f.dslName === dslName) return f
  }

  return null
}

export const findFacetMappingByFacetKey = (
  fields: SidebarFieldsForDb,
  facetKey: string,
): FacetFieldMapping | null => {
  for (const f of fields.facets) {
    if (f.facetKey === facetKey) return f
  }

  return null
}

export const isKeywordField = (
  fields: SidebarFieldsForDb,
  dslName: string,
): boolean => fields.keywords.some((k) => k.dslName === dslName)

export const isDateAxisField = (
  fields: SidebarFieldsForDb,
  dslName: string,
): dslName is DateAxis =>
  fields.dateAxes.includes(dslName as DateAxis)
