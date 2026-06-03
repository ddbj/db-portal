import type { DbSearchResponse } from "~/lib/api"

import type { DbSlug } from "../types"

export type DbHit = DbSearchResponse["hits"][number]

// A meta chip on the bottom row. `vocab` = controlled / identifier-like value
// (rendered mono, "kept exact"); `free` = submitter free text (de-emphasized,
// optional field label); `num` = a formatted numeric quantity.
type DisplayChip =
  | { kind: "vocab"; value: string }
  | { kind: "free"; value: string; labelKey?: string }
  | { kind: "num"; value: string }

const ENTRY_BASE = "https://ddbj.nig.ac.jp/search/entry"

// Detail link, generated from identifier + fine-grained `type` rather than the
// hit's `url` field (the API response shape may change). ES-backed hits use the
// DDBJ Search entry path keyed by `type` (e.g. `sra-analysis`); the two
// Solr-backed DBs have their own canonical hosts. Accepts both per-DB hits and
// cross-search lightweight hits (only identifier + type are read).
export const entryHref = (hit: { identifier: string; type: string }): string => {
  const id = encodeURIComponent(hit.identifier)
  if (hit.type === "trad") {
    return `https://getentry.ddbj.nig.ac.jp/getentry?database=ddbj&accession_number=${id}`
  }
  if (hit.type === "taxonomy") {
    return `https://ddbj.nig.ac.jp/tx_search/${id}?view=info`
  }

  return `${ENTRY_BASE}/${hit.type}/${id}`
}

export const rowTitle = (hit: DbHit): { text: string; isIdentifier: boolean } =>
  "title" in hit && hit.title
    ? { text: hit.title, isIdentifier: false }
    : { text: hit.identifier, isIdentifier: true }

type DatedHit = {
  datePublished?: string | null
  dateModified?: string | null
  dateCreated?: string | null
}

// Date shown in result lists: publication date first, then last-modified, then
// creation date; the first present value wins, null when a hit carries no date
// (e.g. Taxonomy). Shared by per-DB rows and cross-search top hits so the
// fallback order is defined once.
export const resolveDate = (hit: DatedHit): string | null =>
  hit.datePublished ?? hit.dateModified ?? hit.dateCreated ?? null

export const rowDate = (hit: DbHit): string | null => resolveDate(hit)

// Small badge before the title row: the entity subtype where one DB index holds
// several (SRA / JGA), the taxonomic rank, or the Umbrella distinction.
export const subtypeBadge = (hit: DbHit): string | null => {
  if (hit.type.startsWith("sra-") || hit.type.startsWith("jga-")) {
    return hit.type.slice(hit.type.indexOf("-") + 1)
  }
  if (hit.type === "taxonomy") return "rank" in hit && hit.rank ? hit.rank : null
  if (hit.type === "bioproject") {
    return "objectType" in hit && hit.objectType === "UmbrellaBioProject" ? "umbrella" : null
  }

  return null
}

export const isControlled = (hit: DbHit): boolean =>
  "accessibility" in hit && hit.accessibility === "controlled-access"

// Scientific name when it carries signal. JGA is always Homo sapiens and
// Taxonomy's organism is the taxon itself, so both are suppressed.
export const organismName = (db: DbSlug, hit: DbHit): string | null => {
  if (db === "jga" || db === "taxonomy") return null
  if ("organism" in hit && hit.organism && hit.organism.name) return hit.organism.name

  return null
}

export const submitterName = (hit: DbHit): string | null => {
  if ("organization" in hit && Array.isArray(hit.organization) && hit.organization[0]?.name) {
    return hit.organization[0].name
  }

  return null
}

export const rowExcerpt = (hit: DbHit): string | null =>
  "description" in hit && hit.description ? hit.description : null

type TaxonomyExtras = {
  commonName: string | null
  japaneseName: string | null
  lineage: readonly string[]
}

export const taxonomyExtras = (hit: DbHit): TaxonomyExtras | null => {
  if (hit.type !== "taxonomy") return null
  const lineageRaw = "lineage" in hit ? hit.lineage : null
  const lineage = Array.isArray(lineageRaw)
    ? lineageRaw.filter((x): x is string => typeof x === "string" && x.length > 0)
    : typeof lineageRaw === "string" && lineageRaw
      ? lineageRaw.split(/[;,›]/).map((s) => s.trim()).filter(Boolean)
      : []

  return {
    commonName: "commonName" in hit && hit.commonName ? hit.commonName : null,
    japaneseName: "japaneseName" in hit && hit.japaneseName ? hit.japaneseName : null,
    lineage,
  }
}

// Optional field labels for `free` chips (resolved by the row component).
const CHIP_LABEL = {
  host: "search.results.row.host",
  geo: "search.results.row.geo",
} as const

const asStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((x): x is string => typeof x === "string" && x.length > 0) : []

// Per-DB signature meta, in display order. Returns only chips with a value, so
// the same skeleton degrades to nothing where a DB / subtype has no signal.
export const signatureChips = (db: DbSlug, hit: DbHit): DisplayChip[] => {
  const chips: DisplayChip[] = []
  const vocab = (v: unknown) => {
    if (typeof v === "string" && v) chips.push({ kind: "vocab", value: v })
  }
  const vocabList = (v: unknown, max: number) => {
    asStrings(v).slice(0, max).forEach((value) => chips.push({ kind: "vocab", value }))
  }
  const free = (v: unknown, labelKey?: string) => {
    if (typeof v === "string" && v) {
      chips.push(labelKey ? { kind: "free", value: v, labelKey } : { kind: "free", value: v })
    }
  }
  const freeList = (v: unknown, max: number) => {
    asStrings(v).slice(0, max).forEach((value) => chips.push({ kind: "free", value }))
  }

  if (db === "bioproject") {
    if ("projectType" in hit) vocabList(hit.projectType, 2)
    if ("relevance" in hit) vocabList(hit.relevance, 2)
  } else if (db === "biosample") {
    if ("model" in hit) vocabList(hit.model, 1)
    if ("host" in hit) free(hit.host, CHIP_LABEL.host)
    if ("strain" in hit) free(hit.strain)
    if ("isolate" in hit) free(hit.isolate)
    if ("geoLocName" in hit) free(hit.geoLocName, CHIP_LABEL.geo)
  } else if (db === "sra") {
    if ("libraryStrategy" in hit) vocabList(hit.libraryStrategy, 1)
    if ("librarySource" in hit) vocabList(hit.librarySource, 1)
    if ("platform" in hit) vocab(hit.platform)
    if ("instrumentModel" in hit) vocabList(hit.instrumentModel, 1)
    if ("analysisType" in hit) vocab(hit.analysisType)
    if ("geoLocName" in hit) free(hit.geoLocName, CHIP_LABEL.geo)
  } else if (db === "jga") {
    if ("studyType" in hit) freeList(hit.studyType, 2)
    if ("datasetType" in hit) freeList(hit.datasetType, 2)
  } else if (db === "gea") {
    if ("experimentType" in hit) freeList(hit.experimentType, 2)
  } else if (db === "metabobank") {
    if ("experimentType" in hit) freeList(hit.experimentType, 1)
    if ("studyType" in hit) freeList(hit.studyType, 1)
  } else if (db === "trad") {
    if ("molecularType" in hit) vocab(hit.molecularType)
    if ("division" in hit) vocab(hit.division)
    if ("sequenceLength" in hit && typeof hit.sequenceLength === "number") {
      chips.push({ kind: "num", value: `${hit.sequenceLength.toLocaleString("en-US")} bp` })
    }
  }

  return chips
}
