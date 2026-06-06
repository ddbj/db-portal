import {
  crossSearchByAst,
  type CrossSearchResponse,
  type DbPortalFacets,
  dbSearchByAst,
  type DbSearchResponse,
  type ParseNode,
  type ParseNodeInput,
} from "~/lib/api"

import { isIdentityAst } from "../ast"
import { facetAggParam } from "../sidebar/facet-config"
import { type DbSlug, type PerPageValue, type SortKey, sortKeyToApiSort } from "../types"
import { findExactMatch, type ResolvedExactMatch } from "./exact-match"

// Hits resolve through this union so the route has one render path: a cross / per-DB
// payload. A failed request rejects the query (the route reads the error state and
// paints a scope-keyed callout) rather than folding into a variant. The cross arm
// carries the resolved exact-match entry (full hit) so the route renders it without
// re-deriving (docs/search.md § 完全一致カード).
export type SearchResult =
  | { kind: "cross"; cross: CrossSearchResponse; exactMatch: ResolvedExactMatch | null }
  | { kind: "perDb"; perDb: DbSearchResponse }

// One AST-input search: the rendered result, the `dsl` echo to project into `?q=`,
// and the q-aware facets that ride the same response (no separate facet request).
export type SearchResultsPayload = {
  result: SearchResult
  dsl: string
  facets: DbPortalFacets | null
}

export type SearchParams = {
  page: number
  perPage: PerPageValue
  sort: SortKey
}

// Per-DB top hits requested on the cross arm: each named entry that leads its arm
// sits on the first page so the exact-match probe can lift it to a full hit.
const CROSS_TOP_HITS = 3

const EXACT_MATCH_PROBE_PER_PAGE = 20

// Resolve the detected exact match to a full per-DB hit: re-run the committed AST
// against the matched DB and pick the hit with the matched identifier, giving the
// card the full signature chips / lineage of a per-DB row. Any miss / failure folds
// back to the lightweight cross hit so the card always renders.
const resolveExactMatch = async (
  ast: ParseNode,
  databases: CrossSearchResponse["databases"],
  options: { baseUrl?: string },
): Promise<ResolvedExactMatch | null> => {
  const detected = findExactMatch(ast, databases)
  if (!detected) return null
  const fallback: ResolvedExactMatch = {
    db: detected.db,
    hit: detected.hit as unknown as DbSearchResponse["hits"][number],
  }
  try {
    const res = await dbSearchByAst(
      { ast: ast as ParseNodeInput },
      { ...options, query: { db: detected.db, perPage: EXACT_MATCH_PROBE_PER_PAGE } },
    )
    const wanted = detected.hit.identifier.toLowerCase()
    const full = res.hits.find((h) => h.identifier.toLowerCase() === wanted)

    return full ? { db: detected.db, hit: full } : fallback
  } catch {
    return fallback
  }
}

// Post the client-held AST and shape the response for the route. An identity AST
// posts an empty body (match_all, `dsl: ""`), matching the q-less full listing.
export const fetchSearchResults = async (
  db: DbSlug | null,
  ast: ParseNode,
  params: SearchParams,
  baseUrl?: string,
): Promise<SearchResultsPayload> => {
  const options = baseUrl === undefined ? {} : { baseUrl }
  const body = isIdentityAst(ast) ? {} : { ast: ast as ParseNodeInput }
  const agg = facetAggParam(db)
  if (db === null) {
    const cross = await crossSearchByAst(body, { ...options, query: { topHits: CROSS_TOP_HITS, ...agg } })
    const exactMatch = await resolveExactMatch(ast, cross.databases, options)

    return { result: { kind: "cross", cross, exactMatch }, dsl: cross.dsl, facets: cross.facets ?? null }
  }
  const apiSort = sortKeyToApiSort(params.sort)
  const perDb = await dbSearchByAst(body, {
    ...options,
    query: { db, page: params.page, perPage: params.perPage, ...(apiSort ? { sort: apiSort } : {}), ...agg },
  })

  return { result: { kind: "perDb", perDb }, dsl: perDb.dsl, facets: perDb.facets ?? null }
}
