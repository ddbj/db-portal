import { apiGet, apiPost, type ApiRequestOptions } from "./client"
import type { paths } from "./openapi-types"

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
export type SerializeResponse =
  paths["/db-portal/serialize"]["post"]["responses"][200]["content"]["application/json"]

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
