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
  if (hit.type === "ddbj") {
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

// Suppressed entries surface only through an exact accession match (the search
// API unlocks them for that query alone), so flag them in the result list to
// keep a suppressed record from reading as a normal public hit. Accepts per-DB
// hits and cross-search lightweight hits alike.
export const isSuppressed = (hit: { status?: string | null }): boolean =>
  hit.status === "suppressed"

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

// Two-line excerpt: the record's own description. Trad / Taxonomy leave it null
// (their title — the GenBank Definition / scientific name — already carries the
// descriptive content), and publication-derived prose is detail-screen only, so
// those rows simply have no excerpt.
export const rowExcerpt = (hit: DbHit): string | null =>
  "description" in hit && hit.description ? hit.description : null

// The organism's place in the tree of life, shown general→specific and joined
// with " › " under one "Classification" label (the same concept for both DBs).
// Taxonomy reads its named Linnaean ranks (kingdom→genus, always populated and
// clearer to non-specialists than the raw clade chain); Trad has only the raw
// source-organism lineage (standard ranks plus unranked clades). Null for every
// other DB (they show an organism pill instead).
const CLASSIFICATION_LABEL = "search.results.row.classification"

export const ancestryRow = (hit: DbHit): readonly string[] => {
  if (hit.type === "taxonomy") {
    const ranks = [
      "kingdom" in hit ? hit.kingdom : null,
      "phylum" in hit ? hit.phylum : null,
      "class" in hit ? hit.class : null,
      "order" in hit ? hit.order : null,
      "family" in hit ? hit.family : null,
      "genus" in hit ? hit.genus : null,
    ]

    return ranks.filter((x): x is string => typeof x === "string" && x.length > 0)
  }
  if (hit.type === "ddbj" && "lineage" in hit && Array.isArray(hit.lineage)) {
    return hit.lineage.filter((x): x is string => typeof x === "string" && x.length > 0)
  }

  return []
}

export { CLASSIFICATION_LABEL }

// Taxonomy common name, shown as a subtitle next to the scientific name.
export const taxonomyCommonName = (hit: DbHit): string | null =>
  hit.type === "taxonomy" && "commonName" in hit && hit.commonName ? hit.commonName : null

// Optional field labels for `free` chips (resolved by the row component). They
// reuse the sidebar facet field labels so a chip prefix reads the same as the
// matching filter (English in both locales), instead of a separate translation.
const CHIP_LABEL = {
  host: "search.facets.field.host",
  geo: "search.facets.field.geoLocName",
  collected: "search.facets.field.collectionDate",
  synonym: "search.facets.field.synonym",
} as const

// INSDC missing-value reporting terms (MIxS) plus common ad-hoc placeholders.
// Submitters drop these into required attribute fields when no real value exists,
// so a chip should treat them as absent rather than show "Isolate: not applicable".
// Matched case-insensitively after trimming.
const MISSING_VALUE_TOKENS = new Set([
  "n/a", "na", "missing", "not applicable", "not collected", "not provided",
  "not available", "restricted access", "unknown", "none", "null", "-", "?",
])
const meaningful = (v: unknown): string =>
  typeof v === "string" && v && !MISSING_VALUE_TOKENS.has(v.trim().toLowerCase()) ? v : ""

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
    if ("package" in hit && hit.package) vocab(hit.package.displayName ?? hit.package.name)
    if ("model" in hit) vocabList(hit.model, 1)
    if ("host" in hit) free(meaningful(hit.host), CHIP_LABEL.host)
    if ("strain" in hit) free(meaningful(hit.strain))
    if ("isolate" in hit) free(meaningful(hit.isolate))
    if ("geoLocName" in hit) free(meaningful(hit.geoLocName), CHIP_LABEL.geo)
    if ("collectionDate" in hit) free(meaningful(hit.collectionDate), CHIP_LABEL.collected)
  } else if (db === "sra") {
    if ("libraryStrategy" in hit) vocabList(hit.libraryStrategy, 1)
    if ("librarySource" in hit) vocabList(hit.librarySource, 1)
    if ("librarySelection" in hit) vocabList(hit.librarySelection, 1)
    if ("libraryLayout" in hit) vocab(hit.libraryLayout)
    if ("platform" in hit) vocab(hit.platform)
    if ("instrumentModel" in hit) vocabList(hit.instrumentModel, 1)
    if ("analysisType" in hit) vocab(hit.analysisType)
    if ("geoLocName" in hit) free(meaningful(hit.geoLocName), CHIP_LABEL.geo)
    if ("collectionDate" in hit) free(meaningful(hit.collectionDate), CHIP_LABEL.collected)
  } else if (db === "jga") {
    if ("studyType" in hit) freeList(hit.studyType, 2)
    if ("datasetType" in hit) freeList(hit.datasetType, 2)
    if ("vendor" in hit) vocabList(hit.vendor, 2)
  } else if (db === "gea") {
    if ("experimentType" in hit) freeList(hit.experimentType, 2)
  } else if (db === "metabobank") {
    if ("experimentType" in hit) freeList(hit.experimentType, 1)
    if ("studyType" in hit) freeList(hit.studyType, 1)
    if ("submissionType" in hit) vocabList(hit.submissionType, 1)
  } else if (db === "ddbj") {
    if ("molecularType" in hit) vocab(hit.molecularType)
    if ("division" in hit) vocab(hit.division)
    if ("sequenceLength" in hit && typeof hit.sequenceLength === "number") {
      chips.push({ kind: "num", value: `${hit.sequenceLength.toLocaleString("en-US")} bp` })
    }
    if ("geneName" in hit) vocabList(hit.geneName, 2)
  } else if (db === "taxonomy") {
    // The named classification ranks ride the "Classification" row (`ancestryRow`);
    // the remaining Taxonomy signals are the BLAST grouping and an alternate name.
    if ("blastName" in hit) vocab(hit.blastName)
    if ("synonym" in hit) free(asStrings(hit.synonym)[0], CHIP_LABEL.synonym)
  }

  return chips
}
