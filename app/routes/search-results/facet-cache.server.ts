import type { DbPortalFacets } from "~/lib/api"

// match_all (q なし) の facet 集計を scope ごとに in-memory で cache する。全件
// 集計は ES に重く (staging で ~6s) SSR の deferred budget を超えがちな一方、
// 内容はデータ更新まで実質静的なので、長めの TTL で保持して毎リクエストの再集計を
// 避ける。q 付き検索は対象外 (クエリ依存で多様、母集団が小さく速いため都度引く)。
const DEFAULT_TTL_MS = 60 * 60 * 1000

const ttlMs = (): number => {
  const raw = Number(process.env.DB_PORTAL_FACET_CACHE_TTL_MS)

  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_MS
}

type Entry = { facets: DbPortalFacets | null; expiresAt: number }

const store = new Map<string, Entry>()
// cache miss 中の同時アクセスが ES を多重に叩かないよう、進行中の集計を共有する。
const inflight = new Map<string, Promise<DbPortalFacets | null>>()

// scope の match_all facet を返す。鮮度内の cache があればそれを、無ければ fetcher を
// 一度だけ走らせて結果を保持する。fetcher が reject したら cache せず次回再試行する。
export const getCachedMatchAllFacets = (
  scope: string,
  fetcher: () => Promise<DbPortalFacets | null>,
): Promise<DbPortalFacets | null> => {
  const fresh = store.get(scope)
  if (fresh && fresh.expiresAt > Date.now()) return Promise.resolve(fresh.facets)

  const ongoing = inflight.get(scope)
  if (ongoing) return ongoing

  const pending = fetcher()
    .then((facets) => {
      store.set(scope, { facets, expiresAt: Date.now() + ttlMs() })

      return facets
    })
    .finally(() => {
      inflight.delete(scope)
    })
  inflight.set(scope, pending)

  return pending
}

// テスト用: cache をクリアする (テスト間で状態を共有しないため)。
export const clearMatchAllFacetCache = (): void => {
  store.clear()
  inflight.clear()
}
