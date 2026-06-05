import { apiGet, apiPost, type ApiRequestOptions } from "./client"
import type { paths } from "./openapi-types"

export const searchApiBaseUrl = (import.meta.env.VITE_DB_PORTAL_SEARCH_API_URL ?? "") as string

type CrossSearchQuery = NonNullable<paths["/db-portal/cross-search"]["get"]["parameters"]["query"]>
type DbSearchQuery = NonNullable<paths["/db-portal/search"]["get"]["parameters"]["query"]>
type ParseQuery = paths["/db-portal/parse"]["get"]["parameters"]["query"]
type SerializeQuery = NonNullable<paths["/db-portal/serialize"]["post"]["parameters"]["query"]>
type SerializeBody = paths["/db-portal/serialize"]["post"]["requestBody"]["content"]["application/json"]

export type CrossSearchResponse =
  paths["/db-portal/cross-search"]["get"]["responses"][200]["content"]["application/json"]
export type DbSearchResponse =
  paths["/db-portal/search"]["get"]["responses"][200]["content"]["application/json"]
export type ParseResponse =
  paths["/db-portal/parse"]["get"]["responses"][200]["content"]["application/json"]
type SerializeResponse =
  paths["/db-portal/serialize"]["post"]["responses"][200]["content"]["application/json"]

type CrossSearchByAstQuery = NonNullable<paths["/db-portal/cross-search"]["post"]["parameters"]["query"]>
type DbSearchByAstQuery = NonNullable<paths["/db-portal/search"]["post"]["parameters"]["query"]>
type SearchByAstBody = paths["/db-portal/cross-search"]["post"]["requestBody"]["content"]["application/json"]

// GET payload plus the `dsl` echo of the posted AST: the response of the AST-input
// search path, so the caller renders results and syncs `?q=dsl` from one request.
export type CrossSearchByAstResponse =
  paths["/db-portal/cross-search"]["post"]["responses"][200]["content"]["application/json"]
export type DbSearchByAstResponse =
  paths["/db-portal/search"]["post"]["responses"][200]["content"]["application/json"]

// Facet aggregation payload shared by cross-search and single-DB responses
// (`DbPortalFacets`). Each facet is `FacetBucket[] | null` ("null" = not
// aggregated, "[]" = aggregated with zero buckets); `organism` carries a `label`.
export type DbPortalFacets = NonNullable<CrossSearchResponse["facets"]>
export type FacetName = keyof DbPortalFacets

export const crossSearch = (
  query: CrossSearchQuery,
  options: ApiRequestOptions,
): Promise<CrossSearchResponse> =>
  apiGet("/db-portal/cross-search", { ...options, query })

export const dbSearch = (
  query: DbSearchQuery,
  options: ApiRequestOptions,
): Promise<DbSearchResponse> =>
  apiGet("/db-portal/search", { ...options, query })

export const parseQuery = (
  query: ParseQuery,
  options: ApiRequestOptions,
): Promise<ParseResponse> =>
  apiGet("/db-portal/parse", { ...options, query })

export const serializeAst = (
  body: SerializeBody,
  options: ApiRequestOptions & { query?: SerializeQuery },
): Promise<SerializeResponse> =>
  apiPost("/db-portal/serialize", body, options)

// AST-input search: post the client-held AST directly so one request yields hits,
// the q-aware facets, and the serialized `dsl` to sync into `?q=` (no separate
// serialize / parse round trips). An omitted `ast` means match_all (`dsl: ""`).
export const crossSearchByAst = (
  body: SearchByAstBody,
  options: ApiRequestOptions & { query?: CrossSearchByAstQuery },
): Promise<CrossSearchByAstResponse> =>
  apiPost("/db-portal/cross-search", body, options)

export const dbSearchByAst = (
  body: SearchByAstBody,
  options: ApiRequestOptions & { query?: DbSearchByAstQuery },
): Promise<DbSearchByAstResponse> =>
  apiPost("/db-portal/search", body, options)
