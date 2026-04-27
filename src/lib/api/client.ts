import { SEARCH_API_URL } from "./api-url"
import type { components, operations } from "./schema.gen"

export type CrossSearchQuery = NonNullable<operations["crossSearchDbPortal"]["parameters"]["query"]>
export type CrossSearchResponse = components["schemas"]["DbPortalCrossSearchResponse"]
export type SearchQuery = NonNullable<operations["searchDbPortal"]["parameters"]["query"]>
export type SearchResponse = components["schemas"]["DbPortalHitsResponse"]
export type ParseQuery = operations["parseDbPortal"]["parameters"]["query"]
export type ParseResponse = components["schemas"]["DbPortalParseResponse"]
export type ProblemDetails = components["schemas"]["ProblemDetails"]

export type DbPortalLightweightHit = components["schemas"]["DbPortalLightweightHit"]
export type DbPortalHit = SearchResponse["hits"][number]
export type DbPortalCount = components["schemas"]["DbPortalCount"]
export type DbPortalCountError = components["schemas"]["DbPortalCountError"]
export type DbPortalDb = components["schemas"]["DbPortalDb"]

const PROBLEM_TYPE_PREFIX = "https://ddbj.nig.ac.jp/problems/"

export class ApiError extends Error {
  readonly status: number
  readonly problem: ProblemDetails | null

  constructor(status: number, problem: ProblemDetails | null) {
    super(problem?.detail ?? `API error ${status}`)
    this.name = "ApiError"
    this.status = status
    this.problem = problem
  }

  get slug(): string | null {
    const type = this.problem?.type ?? null
    if (type === null) return null
    if (!type.startsWith(PROBLEM_TYPE_PREFIX)) return null

    return type.slice(PROBLEM_TYPE_PREFIX.length)
  }
}

const buildSearch = (query: Record<string, unknown>): string => {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue
    sp.set(key, String(value))
  }
  const qs = sp.toString()

  return qs.length > 0 ? `?${qs}` : ""
}

const apiFetch = async <T>(
  path: string,
  query: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<T> => {
  const url = `${SEARCH_API_URL}${path}${buildSearch(query)}`
  const init: RequestInit = {
    method: "GET",
    headers: { Accept: "application/json" },
  }
  if (signal !== undefined) {
    init.signal = signal
  }
  const res = await fetch(url, init)
  if (res.ok) {
    return res.json() as Promise<T>
  }
  let problem: ProblemDetails | null = null
  try {
    problem = await res.json() as ProblemDetails
  } catch {
    // problem stays null when body is empty or non-JSON
  }
  throw new ApiError(res.status, problem)
}

export const crossSearch = (
  query: CrossSearchQuery,
  signal?: AbortSignal,
): Promise<CrossSearchResponse> =>
  apiFetch<CrossSearchResponse>("/db-portal/cross-search", query, signal)

export const dbSearch = (
  query: SearchQuery,
  signal?: AbortSignal,
): Promise<SearchResponse> =>
  apiFetch<SearchResponse>("/db-portal/search", query, signal)

export const parseAdv = (
  query: ParseQuery,
  signal?: AbortSignal,
): Promise<ParseResponse> =>
  apiFetch<ParseResponse>("/db-portal/parse", query, signal)
