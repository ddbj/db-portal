import type { PerPageValue, SortValue } from "@/lib/search-url"
import type { DbId, ErrorKind } from "@/types/db"
import type { SearchResult } from "@/types/search"

import {
  classifyMockQuery,
  ERROR_KIND_FOR_PARTIAL,
  isHardLimitReached,
  MOCK_TOTAL_COUNTS,
} from "./search-meta"
import { getResultsByDb } from "./search-results"

export class MockError extends Error {
  readonly kind: ErrorKind

  constructor(kind: ErrorKind) {
    super(kind)
    this.name = "MockError"
    this.kind = kind
  }
}

export interface HitCountSuccess {
  dbId: DbId
  count: number
}

export const dbHitCountQueryFn = (
  dbId: DbId,
  q: string | null,
  adv: string | null,
): Promise<HitCountSuccess> => {
  const key = (q ?? adv ?? "")
  switch (classifyMockQuery(key)) {
    case "loading":
      return new Promise(() => undefined)
    case "error":
      return Promise.reject(new MockError("upstream_5xx"))
    case "partial": {
      const kind = ERROR_KIND_FOR_PARTIAL[dbId]
      if (kind !== null) return Promise.reject(new MockError(kind))

      return Promise.resolve({ dbId, count: MOCK_TOTAL_COUNTS[dbId] })
    }
    case "empty":
      return Promise.resolve({ dbId, count: 0 })
    case "normal":
    default:
      return Promise.resolve({ dbId, count: MOCK_TOTAL_COUNTS[dbId] })
  }
}

export interface SearchResultsParams {
  q: string | null
  adv: string | null
  db: DbId
  page: number
  perPage: PerPageValue
  sort: SortValue
}

export interface SearchResultsPayload {
  total: number
  hits: readonly SearchResult[]
  hardLimitReached: boolean
}

const sortResults = (
  results: readonly SearchResult[],
  sort: SortValue,
): readonly SearchResult[] => {
  if (sort === "relevance") return results
  const sorted = [...results]
  sorted.sort((a, b) => {
    const aDate = a.publishedAt ?? ""
    const bDate = b.publishedAt ?? ""
    if (sort === "date_desc") return bDate.localeCompare(aDate)

    return aDate.localeCompare(bDate)
  })

  return sorted
}

export const searchResultsQueryFn = async (
  params: SearchResultsParams,
): Promise<SearchResultsPayload> => {
  const key = (params.q ?? params.adv ?? "")
  const modality = classifyMockQuery(key)

  if (modality === "loading") return new Promise(() => undefined)
  if (modality === "error") throw new MockError("upstream_5xx")

  const hardLimit = isHardLimitReached(params.db, params.page, params.perPage)

  if (modality === "empty") {
    return { total: 0, hits: [], hardLimitReached: hardLimit }
  }

  const base = getResultsByDb(params.db)
  const sorted = sortResults(base, params.sort)
  const offset = (params.page - 1) * params.perPage
  const hits = sorted.slice(offset, offset + params.perPage)
  const total = MOCK_TOTAL_COUNTS[params.db]

  return { total, hits, hardLimitReached: hardLimit }
}
