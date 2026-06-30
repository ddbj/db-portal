import { http, HttpResponse, type RequestHandler } from "msw"

import type {
  CrossSearchByAstResponse,
  CrossSearchResponse,
  DbPortalFacets,
  DbSearchByAstResponse,
  DbSearchResponse,
  ParseResponse,
} from "~/lib/api"
import type { LlmHealth } from "~/schemas/api-bff/llm"
import type { NewsList } from "~/schemas/api-bff/news"
import type { ServiceList } from "~/schemas/api-bff/service"

// ── db-portal search API mocks ──────────────────────────────────────────────

export const minimalParseResponse = (q: string): ParseResponse => ({
  ast: { op: "eq", field: "organism_id", value: q },
})

const minimalCrossSearchResponse = (
  facets: DbPortalFacets | null = null,
): CrossSearchResponse => ({
  databases: [{ db: "bioproject", count: 10, error: null }],
  facets,
})

export const minimalDbSearchResponse = (
  facets: DbPortalFacets | null = null,
): DbSearchResponse => ({
  total: 5,
  hits: [],
  hardLimitReached: false,
  page: 1,
  perPage: 20,
  hasNext: false,
  facets,
})

export const parseHandler = (
  overrides: { response?: ParseResponse } = {},
): RequestHandler =>
  http.get("*/db-portal/parse", ({ request }) => {
    const url = new URL(request.url)
    const q = url.searchParams.get("q") ?? "q"
    return HttpResponse.json(overrides.response ?? minimalParseResponse(q))
  })

export const crossSearchHandler = (
  overrides: {
    response?: CrossSearchResponse
    onRequest?: (url: URL) => void
  } = {},
): RequestHandler =>
  http.get("*/db-portal/cross-search", ({ request }) => {
    const url = new URL(request.url)
    overrides.onRequest?.(url)
    return HttpResponse.json(overrides.response ?? minimalCrossSearchResponse())
  })

export const dbSearchHandler = (
  overrides: {
    response?: DbSearchResponse
    onRequest?: (url: URL) => void
  } = {},
): RequestHandler =>
  http.get("*/db-portal/search", ({ request }) => {
    const url = new URL(request.url)
    overrides.onRequest?.(url)
    return HttpResponse.json(overrides.response ?? minimalDbSearchResponse())
  })

// AST-input (POST) search mocks: the GET payload plus the `dsl` echo the route
// projects into `?q=`. onRequest exposes the posted body so a test can assert the
// AST (or its absence for match_all) and the query params.
export const minimalCrossSearchByAstResponse = (
  dsl: string,
  facets: DbPortalFacets | null = null,
): CrossSearchByAstResponse => ({ ...minimalCrossSearchResponse(facets), dsl })

export const minimalDbSearchByAstResponse = (
  dsl: string,
  facets: DbPortalFacets | null = null,
): DbSearchByAstResponse => ({ ...minimalDbSearchResponse(facets), dsl })

export const crossSearchByAstHandler = (
  overrides: {
    response?: CrossSearchByAstResponse
    onRequest?: (url: URL, body: unknown) => void
  } = {},
): RequestHandler =>
  http.post("*/db-portal/cross-search", async ({ request }) => {
    const url = new URL(request.url)
    const body = await request.json().catch(() => ({}))
    overrides.onRequest?.(url, body)
    return HttpResponse.json(overrides.response ?? minimalCrossSearchByAstResponse(""))
  })

export const dbSearchByAstHandler = (
  overrides: {
    response?: DbSearchByAstResponse
    onRequest?: (url: URL, body: unknown) => void
  } = {},
): RequestHandler =>
  http.post("*/db-portal/search", async ({ request }) => {
    const url = new URL(request.url)
    const body = await request.json().catch(() => ({}))
    overrides.onRequest?.(url, body)
    return HttpResponse.json(overrides.response ?? minimalDbSearchByAstResponse(""))
  })

const unsetHealth: LlmHealth = { status: "unset" }
const emptyNews: NewsList = []
const emptyServices: ServiceList = []

export const meAnonymous = (): RequestHandler =>
  http.get("*/api/me", () => new HttpResponse(null, { status: 401 }))

export const newsList = (items: NewsList): RequestHandler =>
  http.get("*/api/news", () => HttpResponse.json(items))

export const servicesList = (items: ServiceList): RequestHandler =>
  http.get("*/api/services", () => HttpResponse.json(items))

export const llmHealth = (health: LlmHealth): RequestHandler =>
  http.get("*/api/llm/health", () => HttpResponse.json(health))

export const handlers: RequestHandler[] = [
  meAnonymous(),
  newsList(emptyNews),
  servicesList(emptyServices),
  llmHealth(unsetHealth),
]
