import type { CrossSearchResponse, ParseNode } from "~/lib/api"

import { isIdentityAst, splitFreeText } from "../ast"
import { type DbSlug, isDbSlug } from "../types"
import { CARD_ORDER } from "./cross-results"
import type { DbHit } from "./result-fields"

// One cross-search lightweight hit (identifier / type / title / organism / status
// / dates), the shape carried by each DB arm of the cross-search response.
type LightweightHit = NonNullable<CrossSearchResponse["databases"][number]["hits"]>[number]

// A detected match: the lightweight hit found in the cross-search top hits.
export type ExactMatch = { db: DbSlug; hit: LightweightHit }

// A match resolved for display: the full per-DB hit the loader fetches for the
// detected entry (or the lightweight hit cast to `DbHit` when that fetch finds
// nothing — every result-fields helper guards with `"x" in hit`, so the row
// degrades to whatever fields the hit carries). Carried by the cross loader
// result and rendered by `ExactMatchCard` (docs/search.md § 完全一致カード).
export type ResolvedExactMatch = { db: DbSlug; hit: DbHit }

const isFreeText = (node: ParseNode): node is Extract<ParseNode, { op: "free_text" }> =>
  node.op === "free_text"

// Raw free-text values of a query whose structured remainder is empty: a single
// top-level free_text, or the children of a top-level AND (all free_text once the
// gate below confirms `splitFreeText`'s rest is empty).
const freeTextValues = (ast: ParseNode): string[] => {
  if (isFreeText(ast)) return [ast.value]
  if (ast.op === "AND") return ast.rules.filter(isFreeText).map((node) => node.value)

  return []
}

const cardOrderIndex = (db: string): number => {
  const index = CARD_ORDER.indexOf(db as DbSlug)

  return index === -1 ? CARD_ORDER.length : index
}

// Scan each DB's top hits in DDBJ-first order so a hit shared across DBs resolves
// to the same arm the grid leads with.
const firstMatch = (
  databases: CrossSearchResponse["databases"],
  matches: (hit: LightweightHit) => boolean,
): ExactMatch | null => {
  const ordered = [...databases].sort((a, b) => cardOrderIndex(a.db) - cardOrderIndex(b.db))
  for (const entry of ordered) {
    if (!isDbSlug(entry.db)) continue
    for (const hit of entry.hits ?? []) {
      if (matches(hit)) return { db: entry.db, hit }
    }
  }

  return null
}

// The one entry a name-it query points at, surfaced above the cross-DB grid like
// an Entrez sensor. Only fires for a plain lookup — a single free_text or an AND
// of free_text (e.g. space-separated "Homo sapiens"), with no structured leaf,
// OR / NOT, wildcard, or facet remainder. Matching uses only the lightweight top
// hits already in the response (no extra request); a match outside the topHits
// window is simply not shown. Accession (identifier) is preferred over organism;
// see docs/search.md § 完全一致カード.
export const findExactMatch = (
  ast: ParseNode | null,
  databases: CrossSearchResponse["databases"],
): ExactMatch | null => {
  if (!ast) return null
  // A non-empty structured remainder means the query is more than a lookup.
  if (!isIdentityAst(splitFreeText(ast).rest)) return null

  const values = freeTextValues(ast).map((value) => value.trim()).filter((value) => value.length > 0)
  if (values.length === 0) return null
  // Wildcards never unlock an exact match (mirrors the backend's suppressed rule).
  if (values.some((value) => value.includes("*") || value.includes("?"))) return null

  const accessionTerms = values.map((value) => value.toLowerCase())
  const organismTerm = values.join(" ").toLowerCase()

  const accession = firstMatch(
    databases,
    (hit) => accessionTerms.includes(hit.identifier.toLowerCase()),
  )
  if (accession) return accession

  return firstMatch(
    databases,
    (hit) =>
      hit.type === "taxonomy"
      && [hit.title, hit.organism?.name].some(
        (name) => typeof name === "string" && name.toLowerCase() === organismTerm,
      ),
  )
}
