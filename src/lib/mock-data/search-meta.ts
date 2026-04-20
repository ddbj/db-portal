import type { PerPageValue } from "@/lib/search-url"
import type { DbId, ErrorKind } from "@/types/db"

export const MOCK_TOTAL_COUNTS: Readonly<Record<DbId, number>> = {
  bioproject: 45_678,
  biosample: 234_500,
  sra: 189_923,
  trad: 15_234,
  taxonomy: 271_403,
  jga: 423,
  gea: 8_712,
  metabobank: 1_240,
} as const

export const MOCK_QUERY_PREFIX = {
  loading: "__loading__",
  error: "__error__",
  partial: "__partial__",
  empty: "__empty__",
} as const

export type MockModality = "loading" | "error" | "partial" | "empty" | "normal"

export const classifyMockQuery = (raw: string | null): MockModality => {
  if (raw === null) return "normal"
  const t = raw.trim()
  if (t.startsWith(MOCK_QUERY_PREFIX.loading)) return "loading"
  if (t.startsWith(MOCK_QUERY_PREFIX.error)) return "error"
  if (t.startsWith(MOCK_QUERY_PREFIX.partial)) return "partial"
  if (t.startsWith(MOCK_QUERY_PREFIX.empty)) return "empty"

  return "normal"
}

export const SOLR_BACKED_DBS: ReadonlySet<DbId> = new Set<DbId>(["trad", "taxonomy"])

export const isSolrBacked = (dbId: DbId): boolean => SOLR_BACKED_DBS.has(dbId)

export const SOLR_HARD_LIMIT = 10_000

export const isHardLimitReached = (
  dbId: DbId,
  page: number,
  perPage: PerPageValue,
): boolean => {
  if (!isSolrBacked(dbId)) return false
  const maxPage = Math.ceil(SOLR_HARD_LIMIT / perPage)

  return page >= maxPage
}

export const ERROR_KIND_FOR_PARTIAL: Readonly<Record<DbId, ErrorKind | null>> = {
  bioproject: null,
  biosample: "timeout",
  sra: null,
  trad: "upstream_5xx",
  taxonomy: "timeout",
  jga: null,
  gea: "upstream_5xx",
  metabobank: null,
} as const
