import type { AdvancedFieldDef } from "@/lib/advanced-search/types"
import type { DbSelectValue } from "@/lib/search-url"
import { ALL_DB_VALUE } from "@/lib/search-url"
import type { DbId } from "@/types/db"
import { DB_ORDER } from "@/types/db"

const DB_EXCEPT_TAXONOMY: readonly DbId[] = DB_ORDER.filter((d) => d !== "taxonomy")

const IDENTIFIER_OPS = ["equals", "starts_with", "wildcard"] as const
const TEXT_OPS = ["contains", "equals", "starts_with", "wildcard"] as const
const ORGANISM_OPS = ["equals", "contains"] as const
const DATE_OPS = ["between", "gte", "lte", "equals"] as const
const NUMBER_OPS = ["between", "gte", "lte", "equals"] as const
const ENUM_OPS = ["equals", "not_equals"] as const

const enumKey = (fieldId: string, valueKey: string): string =>
  `routes.advancedSearch.fields.${fieldId}.enumValues.${valueKey}`

const TIER1_FIELDS: readonly AdvancedFieldDef[] = [
  {
    id: "identifier",
    dslName: "identifier",
    tier: 1,
    type: "identifier",
    availableOps: IDENTIFIER_OPS,
    availableDbs: DB_ORDER,
    placeholderKey: "routes.advancedSearch.fields.identifier.placeholder",
  },
  {
    id: "title",
    dslName: "title",
    tier: 1,
    type: "text",
    availableOps: TEXT_OPS,
    availableDbs: DB_ORDER,
  },
  {
    id: "description",
    dslName: "description",
    tier: 1,
    type: "text",
    availableOps: TEXT_OPS,
    availableDbs: DB_ORDER,
  },
  {
    id: "organism",
    dslName: "organism",
    tier: 1,
    type: "organism",
    availableOps: ORGANISM_OPS,
    availableDbs: DB_EXCEPT_TAXONOMY,
    placeholderKey: "routes.advancedSearch.fields.organism.placeholder",
  },
  {
    id: "date_published",
    dslName: "date_published",
    tier: 1,
    type: "date",
    availableOps: DATE_OPS,
    availableDbs: DB_EXCEPT_TAXONOMY,
  },
  {
    id: "date_modified",
    dslName: "date_modified",
    tier: 1,
    type: "date",
    availableOps: DATE_OPS,
    availableDbs: DB_EXCEPT_TAXONOMY,
  },
  {
    id: "date_created",
    dslName: "date_created",
    tier: 1,
    type: "date",
    availableOps: DATE_OPS,
    availableDbs: DB_EXCEPT_TAXONOMY,
  },
  {
    id: "date",
    dslName: "date",
    tier: 1,
    type: "date",
    availableOps: DATE_OPS,
    availableDbs: DB_EXCEPT_TAXONOMY,
  },
]

const TIER2_FIELDS: readonly AdvancedFieldDef[] = [
  {
    id: "submitter",
    dslName: "submitter",
    tier: 2,
    type: "text",
    availableOps: TEXT_OPS,
    availableDbs: DB_ORDER,
  },
  {
    id: "publication",
    dslName: "publication",
    tier: 2,
    type: "identifier",
    availableOps: IDENTIFIER_OPS,
    availableDbs: DB_ORDER,
  },
]

const SRA_GEA_DBS: readonly DbId[] = ["sra", "gea"]

const TIER3_SRA_GEA: readonly AdvancedFieldDef[] = [
  {
    id: "library_strategy",
    dslName: "library_strategy",
    tier: 3,
    type: "enum",
    availableOps: ENUM_OPS,
    availableDbs: SRA_GEA_DBS,
    enumValues: [
      { value: "WGS", labelKey: enumKey("library_strategy", "wgs") },
      { value: "RNA-Seq", labelKey: enumKey("library_strategy", "rna_seq") },
      { value: "ChIP-Seq", labelKey: enumKey("library_strategy", "chip_seq") },
      { value: "AMPLICON", labelKey: enumKey("library_strategy", "amplicon") },
      { value: "Bisulfite-Seq", labelKey: enumKey("library_strategy", "bisulfite_seq") },
      { value: "Hi-C", labelKey: enumKey("library_strategy", "hi_c") },
      { value: "ATAC-seq", labelKey: enumKey("library_strategy", "atac_seq") },
      { value: "OTHER", labelKey: enumKey("library_strategy", "other") },
    ],
  },
  {
    id: "library_source",
    dslName: "library_source",
    tier: 3,
    type: "enum",
    availableOps: ENUM_OPS,
    availableDbs: SRA_GEA_DBS,
    enumValues: [
      { value: "GENOMIC", labelKey: enumKey("library_source", "genomic") },
      { value: "TRANSCRIPTOMIC", labelKey: enumKey("library_source", "transcriptomic") },
      { value: "METAGENOMIC", labelKey: enumKey("library_source", "metagenomic") },
      { value: "METATRANSCRIPTOMIC", labelKey: enumKey("library_source", "metatranscriptomic") },
      { value: "SYNTHETIC", labelKey: enumKey("library_source", "synthetic") },
      { value: "VIRAL RNA", labelKey: enumKey("library_source", "viral_rna") },
      { value: "OTHER", labelKey: enumKey("library_source", "other") },
    ],
  },
  {
    id: "library_layout",
    dslName: "library_layout",
    tier: 3,
    type: "enum",
    availableOps: ENUM_OPS,
    availableDbs: SRA_GEA_DBS,
    enumValues: [
      { value: "SINGLE", labelKey: enumKey("library_layout", "single") },
      { value: "PAIRED", labelKey: enumKey("library_layout", "paired") },
    ],
  },
  {
    id: "platform",
    dslName: "platform",
    tier: 3,
    type: "enum",
    availableOps: ENUM_OPS,
    availableDbs: SRA_GEA_DBS,
    enumValues: [
      { value: "ILLUMINA", labelKey: enumKey("platform", "illumina") },
      { value: "PACBIO_SMRT", labelKey: enumKey("platform", "pacbio_smrt") },
      { value: "OXFORD_NANOPORE", labelKey: enumKey("platform", "oxford_nanopore") },
      { value: "BGISEQ", labelKey: enumKey("platform", "bgiseq") },
      { value: "ION_TORRENT", labelKey: enumKey("platform", "ion_torrent") },
    ],
  },
  {
    id: "instrument_model",
    dslName: "instrument_model",
    tier: 3,
    type: "text",
    availableOps: TEXT_OPS,
    availableDbs: SRA_GEA_DBS,
  },
]

const BIOSAMPLE_DBS: readonly DbId[] = ["biosample"]

const TIER3_BIOSAMPLE: readonly AdvancedFieldDef[] = [
  {
    id: "geo_loc_name",
    dslName: "geo_loc_name",
    tier: 3,
    type: "text",
    availableOps: TEXT_OPS,
    availableDbs: BIOSAMPLE_DBS,
  },
  {
    id: "collection_date",
    dslName: "collection_date",
    tier: 3,
    type: "date",
    availableOps: DATE_OPS,
    availableDbs: BIOSAMPLE_DBS,
  },
  {
    id: "host",
    dslName: "host",
    tier: 3,
    type: "text",
    availableOps: TEXT_OPS,
    availableDbs: BIOSAMPLE_DBS,
  },
  {
    id: "disease",
    dslName: "disease",
    tier: 3,
    type: "text",
    availableOps: TEXT_OPS,
    availableDbs: BIOSAMPLE_DBS,
  },
  {
    id: "tissue",
    dslName: "tissue",
    tier: 3,
    type: "text",
    availableOps: TEXT_OPS,
    availableDbs: BIOSAMPLE_DBS,
  },
  {
    id: "env_biome",
    dslName: "env_biome",
    tier: 3,
    type: "text",
    availableOps: TEXT_OPS,
    availableDbs: BIOSAMPLE_DBS,
  },
]

const BIOPROJECT_DBS: readonly DbId[] = ["bioproject"]

const TIER3_BIOPROJECT: readonly AdvancedFieldDef[] = [
  {
    id: "project_type",
    dslName: "project_type",
    tier: 3,
    type: "enum",
    availableOps: ENUM_OPS,
    availableDbs: BIOPROJECT_DBS,
    enumValues: [
      {
        value: "Genome sequencing",
        labelKey: enumKey("project_type", "genome_sequencing"),
      },
      {
        value: "Transcriptome",
        labelKey: enumKey("project_type", "transcriptome"),
      },
      {
        value: "Metagenome",
        labelKey: enumKey("project_type", "metagenome"),
      },
      {
        value: "Epigenome",
        labelKey: enumKey("project_type", "epigenome"),
      },
      {
        value: "Variation",
        labelKey: enumKey("project_type", "variation"),
      },
    ],
  },
  {
    id: "bioproject_grant_agency",
    dslName: "grant_agency",
    tier: 3,
    type: "text",
    availableOps: TEXT_OPS,
    availableDbs: BIOPROJECT_DBS,
  },
  {
    id: "child_biosamples",
    dslName: "child_biosamples",
    tier: 3,
    type: "identifier",
    availableOps: IDENTIFIER_OPS,
    availableDbs: BIOPROJECT_DBS,
  },
]

const TRAD_DBS: readonly DbId[] = ["trad"]

const TIER3_TRAD: readonly AdvancedFieldDef[] = [
  {
    id: "division",
    dslName: "division",
    tier: 3,
    type: "enum",
    availableOps: ENUM_OPS,
    availableDbs: TRAD_DBS,
    enumValues: [
      { value: "BCT", labelKey: enumKey("division", "bct") },
      { value: "VRL", labelKey: enumKey("division", "vrl") },
      { value: "PLN", labelKey: enumKey("division", "pln") },
      { value: "INV", labelKey: enumKey("division", "inv") },
      { value: "VRT", labelKey: enumKey("division", "vrt") },
      { value: "MAM", labelKey: enumKey("division", "mam") },
      { value: "PRI", labelKey: enumKey("division", "pri") },
      { value: "ROD", labelKey: enumKey("division", "rod") },
      { value: "PAT", labelKey: enumKey("division", "pat") },
      { value: "ENV", labelKey: enumKey("division", "env") },
    ],
  },
  {
    id: "molecular_type",
    dslName: "molecular_type",
    tier: 3,
    type: "enum",
    availableOps: ENUM_OPS,
    availableDbs: TRAD_DBS,
    enumValues: [
      { value: "DNA", labelKey: enumKey("molecular_type", "dna") },
      { value: "RNA", labelKey: enumKey("molecular_type", "rna") },
      { value: "cRNA", labelKey: enumKey("molecular_type", "crna") },
      { value: "mRNA", labelKey: enumKey("molecular_type", "mrna") },
      { value: "ncRNA", labelKey: enumKey("molecular_type", "ncrna") },
    ],
  },
  {
    id: "sequence_length",
    dslName: "sequence_length",
    tier: 3,
    type: "number",
    availableOps: NUMBER_OPS,
    availableDbs: TRAD_DBS,
  },
  {
    id: "feature_gene_name",
    dslName: "feature_gene_name",
    tier: 3,
    type: "text",
    availableOps: TEXT_OPS,
    availableDbs: TRAD_DBS,
  },
  {
    id: "reference_journal",
    dslName: "reference_journal",
    tier: 3,
    type: "text",
    availableOps: TEXT_OPS,
    availableDbs: TRAD_DBS,
  },
]

const TAXONOMY_DBS: readonly DbId[] = ["taxonomy"]

const TIER3_TAXONOMY: readonly AdvancedFieldDef[] = [
  {
    id: "rank",
    dslName: "rank",
    tier: 3,
    type: "enum",
    availableOps: ENUM_OPS,
    availableDbs: TAXONOMY_DBS,
    enumValues: [
      { value: "kingdom", labelKey: enumKey("rank", "kingdom") },
      { value: "phylum", labelKey: enumKey("rank", "phylum") },
      { value: "class", labelKey: enumKey("rank", "class") },
      { value: "order", labelKey: enumKey("rank", "order") },
      { value: "family", labelKey: enumKey("rank", "family") },
      { value: "genus", labelKey: enumKey("rank", "genus") },
      { value: "species", labelKey: enumKey("rank", "species") },
      { value: "strain", labelKey: enumKey("rank", "strain") },
    ],
  },
  { id: "lineage", dslName: "lineage", tier: 3, type: "text", availableOps: TEXT_OPS, availableDbs: TAXONOMY_DBS },
  { id: "kingdom", dslName: "kingdom", tier: 3, type: "text", availableOps: TEXT_OPS, availableDbs: TAXONOMY_DBS },
  { id: "phylum", dslName: "phylum", tier: 3, type: "text", availableOps: TEXT_OPS, availableDbs: TAXONOMY_DBS },
  { id: "class", dslName: "class", tier: 3, type: "text", availableOps: TEXT_OPS, availableDbs: TAXONOMY_DBS },
  { id: "order", dslName: "order", tier: 3, type: "text", availableOps: TEXT_OPS, availableDbs: TAXONOMY_DBS },
  { id: "family", dslName: "family", tier: 3, type: "text", availableOps: TEXT_OPS, availableDbs: TAXONOMY_DBS },
  { id: "genus", dslName: "genus", tier: 3, type: "text", availableOps: TEXT_OPS, availableDbs: TAXONOMY_DBS },
  { id: "species", dslName: "species", tier: 3, type: "text", availableOps: TEXT_OPS, availableDbs: TAXONOMY_DBS },
  { id: "common_name", dslName: "common_name", tier: 3, type: "text", availableOps: TEXT_OPS, availableDbs: TAXONOMY_DBS },
  { id: "japanese_name", dslName: "japanese_name", tier: 3, type: "text", availableOps: TEXT_OPS, availableDbs: TAXONOMY_DBS },
]

const JGA_DBS: readonly DbId[] = ["jga"]

const TIER3_JGA: readonly AdvancedFieldDef[] = [
  {
    id: "study_type",
    dslName: "study_type",
    tier: 3,
    type: "enum",
    availableOps: ENUM_OPS,
    availableDbs: JGA_DBS,
    enumValues: [
      { value: "Case-Control", labelKey: enumKey("study_type", "case_control") },
      { value: "Case Set", labelKey: enumKey("study_type", "case_set") },
      { value: "Population Genomics", labelKey: enumKey("study_type", "population_genomics") },
      { value: "Cohort", labelKey: enumKey("study_type", "cohort") },
    ],
  },
  {
    id: "jga_grant_agency",
    dslName: "grant_agency",
    tier: 3,
    type: "text",
    availableOps: TEXT_OPS,
    availableDbs: JGA_DBS,
  },
  {
    id: "principal_investigator",
    dslName: "principal_investigator",
    tier: 3,
    type: "text",
    availableOps: TEXT_OPS,
    availableDbs: JGA_DBS,
  },
  {
    id: "submitting_organization",
    dslName: "submitting_organization",
    tier: 3,
    type: "text",
    availableOps: TEXT_OPS,
    availableDbs: JGA_DBS,
  },
]

export const ADVANCED_FIELDS: readonly AdvancedFieldDef[] = [
  ...TIER1_FIELDS,
  ...TIER2_FIELDS,
  ...TIER3_SRA_GEA,
  ...TIER3_BIOSAMPLE,
  ...TIER3_BIOPROJECT,
  ...TIER3_TRAD,
  ...TIER3_TAXONOMY,
  ...TIER3_JGA,
]

const FIELD_BY_ID = new Map<string, AdvancedFieldDef>(
  ADVANCED_FIELDS.map((f) => [f.id, f] as const),
)

export const findField = (id: string): AdvancedFieldDef | undefined =>
  FIELD_BY_ID.get(id)

export const isTier3 = (id: string): boolean =>
  FIELD_BY_ID.get(id)?.tier === 3

export const getFieldsForTier = (
  tier: 1 | 2 | 3,
): readonly AdvancedFieldDef[] =>
  ADVANCED_FIELDS.filter((f) => f.tier === tier)

export const getFieldsForDb = (
  db: DbSelectValue,
): readonly AdvancedFieldDef[] => {
  if (db === ALL_DB_VALUE) {
    return ADVANCED_FIELDS.filter((f) => f.tier !== 3)
  }

  return ADVANCED_FIELDS.filter((f) => f.availableDbs.includes(db))
}

export const isFieldAvailableForDb = (
  fieldId: string,
  db: DbSelectValue,
): boolean => {
  const field = FIELD_BY_ID.get(fieldId)
  if (field === undefined) return false
  if (db === ALL_DB_VALUE) return field.tier !== 3

  return field.availableDbs.includes(db)
}

export const fieldLabelKey = (fieldId: string): string =>
  `routes.advancedSearch.fields.${fieldId}.label`
