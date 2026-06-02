import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import type { Request, Response } from "express"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import type { ServiceItem, ServiceList } from "~/schemas/api-bff/service"

import { handleServices } from "../../../../server/api/services"
import type { CacheStore } from "../../../../server/services/cache"
import { createCacheStore } from "../../../../server/services/cache"
import { getActiveServicesCache } from "../../../../server/services/mirror"
import { silentLogger } from "../services/_fixtures"

// getActiveServicesCache は FS で同期されるシングルトンを返す外部境界。
// ここだけ mock し、フィルタリングは実 CacheStore (createCacheStore) を駆動する。
vi.mock("../../../../server/services/mirror", () => ({
  getActiveServicesCache: vi.fn<() => CacheStore | undefined>(),
}))

const item = (
  over: Partial<ServiceItem> & Pick<ServiceItem, "id" | "source" | "name">,
): ServiceItem => ({
  description: { ja: "", en: "" },
  categories: ["other"],
  rawCategories: [],
  featuredTop: false,
  ...over,
})

const items: ServiceList = [
  item({
    id: "ddbj-bioproject",
    source: "ddbj",
    name: { ja: "BioProject", en: "BioProject" },
    categories: ["repository"],
    featuredTop: true,
  }),
  item({
    id: "ddbj-txsearch",
    source: "ddbj",
    name: { ja: "TXSearch", en: "TXSearch" },
    categories: ["search"],
    featuredTop: false,
  }),
  item({
    id: "dbcls-togoid",
    source: "dbcls",
    name: { ja: "TogoID", en: "TogoID" },
    categories: ["integration", "search"],
    featuredTop: true,
  }),
  item({
    id: "dbcls-refex",
    source: "dbcls",
    name: { ja: "RefEx", en: "RefEx" },
    categories: ["other"],
    featuredTop: false,
  }),
]

type RecordedRes = {
  statusCode: number | undefined
  body: unknown
  headers: Record<string, string>
  setHeader: ReturnType<typeof vi.fn>
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
}

const makeRes = (): RecordedRes => {
  const headers: Record<string, string> = {}
  const res: RecordedRes = {
    statusCode: undefined,
    body: undefined,
    headers,
    setHeader: vi.fn((name: string, value: string) => {
      headers[name] = value
    }),
    status: vi.fn((code: number) => {
      res.statusCode = code

      return res
    }),
    json: vi.fn((payload: unknown) => {
      res.body = payload

      return res
    }),
  }

  return res
}

const makeReq = (query: string): Request =>
  ({ originalUrl: `/api/services${query}` }) as unknown as Request

const ids = (body: unknown): string[] => (body as ServiceList).map((s) => s.id)

let cacheDir: string
let cache: CacheStore

beforeEach(async () => {
  cacheDir = await mkdtemp(path.join(tmpdir(), "svc-api-cache-"))
  cache = createCacheStore(cacheDir, silentLogger)
  await cache.replaceItemsForSource("ddbj", items.filter((s) => s.source === "ddbj"), "sha")
  await cache.replaceItemsForSource("dbcls", items.filter((s) => s.source === "dbcls"), "sha")
  vi.mocked(getActiveServicesCache).mockReturnValue(cache)
})

afterEach(async () => {
  vi.clearAllMocks()
  await rm(cacheDir, { recursive: true, force: true })
})

describe("handleServices Cache-Control", () => {
  test("handleServices_always_setsPublicMaxAge60", () => {
    const res = makeRes()
    handleServices(makeReq(""), res as unknown as Response)
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "public, max-age=60")
    expect(res.headers["Cache-Control"]).toBe("public, max-age=60")
  })

  test("handleServices_noCache_setsCacheControlBeforeRespondingEmpty", () => {
    vi.mocked(getActiveServicesCache).mockReturnValue(undefined)
    const res = makeRes()
    handleServices(makeReq(""), res as unknown as Response)
    expect(res.headers["Cache-Control"]).toBe("public, max-age=60")
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe("handleServices no active cache", () => {
  test("handleServices_cacheUndefined_responds200WithEmptyArray", () => {
    vi.mocked(getActiveServicesCache).mockReturnValue(undefined)
    const res = makeRes()
    handleServices(makeReq("?source=ddbj&featured=true"), res as unknown as Response)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe("handleServices no filter", () => {
  test("handleServices_noQuery_returnsAllItems", () => {
    const res = makeRes()
    handleServices(makeReq(""), res as unknown as Response)
    expect(res.statusCode).toBe(200)
    expect(ids(res.body).sort()).toEqual([
      "dbcls-refex",
      "dbcls-togoid",
      "ddbj-bioproject",
      "ddbj-txsearch",
    ])
  })
})

describe("handleServices source filter", () => {
  test("handleServices_sourceDdbj_returnsOnlyDdbjItems", () => {
    const res = makeRes()
    handleServices(makeReq("?source=ddbj"), res as unknown as Response)
    expect(ids(res.body).sort()).toEqual(["ddbj-bioproject", "ddbj-txsearch"])
  })

  test("handleServices_sourceCsvBothValues_returnsUnion", () => {
    const res = makeRes()
    handleServices(makeReq("?source=ddbj,dbcls"), res as unknown as Response)
    expect(ids(res.body)).toHaveLength(4)
  })

  test("handleServices_sourceWithWhitespaceAndEmptyEntries_trimsAndIgnoresBlanks", () => {
    const res = makeRes()
    handleServices(makeReq("?source=%20ddbj%20,,"), res as unknown as Response)
    expect(ids(res.body).sort()).toEqual(["ddbj-bioproject", "ddbj-txsearch"])
  })

  test("handleServices_sourceUnknownValueOnly_filtersOutAndReturnsAll", () => {
    const res = makeRes()
    handleServices(makeReq("?source=ncbi"), res as unknown as Response)
    expect(ids(res.body)).toHaveLength(4)
  })

  test("handleServices_sourceMixesValidAndInvalid_keepsOnlyValid", () => {
    const res = makeRes()
    handleServices(makeReq("?source=dbcls,ncbi"), res as unknown as Response)
    expect(ids(res.body).sort()).toEqual(["dbcls-refex", "dbcls-togoid"])
  })
})

describe("handleServices category filter", () => {
  test("handleServices_categorySearch_returnsItemsWithThatCategory", () => {
    const res = makeRes()
    handleServices(makeReq("?category=search"), res as unknown as Response)
    expect(ids(res.body).sort()).toEqual(["dbcls-togoid", "ddbj-txsearch"])
  })

  test("handleServices_categoryUnknownValueOnly_filtersOutAndReturnsAll", () => {
    const res = makeRes()
    handleServices(makeReq("?category=genomics"), res as unknown as Response)
    expect(ids(res.body)).toHaveLength(4)
  })

  test("handleServices_categoryMixesValidAndInvalid_keepsOnlyValid", () => {
    const res = makeRes()
    handleServices(makeReq("?category=search,genomics"), res as unknown as Response)
    expect(ids(res.body).sort()).toEqual(["dbcls-togoid", "ddbj-txsearch"])
  })
})

describe("handleServices featured filter (parseFeatured contract)", () => {
  test("handleServices_featuredTrue_returnsOnlyFeatured", () => {
    const res = makeRes()
    handleServices(makeReq("?featured=true"), res as unknown as Response)
    expect(ids(res.body).sort()).toEqual(["dbcls-togoid", "ddbj-bioproject"])
  })

  test("handleServices_featured1_returnsOnlyFeatured", () => {
    const res = makeRes()
    handleServices(makeReq("?featured=1"), res as unknown as Response)
    expect(ids(res.body).sort()).toEqual(["dbcls-togoid", "ddbj-bioproject"])
  })

  test("handleServices_featuredZero_treatedAsFalseReturnsAll", () => {
    const res = makeRes()
    handleServices(makeReq("?featured=0"), res as unknown as Response)
    expect(ids(res.body)).toHaveLength(4)
  })

  test("handleServices_featuredUppercaseTRUE_treatedAsFalseReturnsAll", () => {
    const res = makeRes()
    handleServices(makeReq("?featured=TRUE"), res as unknown as Response)
    expect(ids(res.body)).toHaveLength(4)
  })

  test("handleServices_featuredEmptyValue_treatedAsFalseReturnsAll", () => {
    const res = makeRes()
    handleServices(makeReq("?featured="), res as unknown as Response)
    expect(ids(res.body)).toHaveLength(4)
  })

  test("handleServices_featuredAbsent_treatedAsFalseReturnsAll", () => {
    const res = makeRes()
    handleServices(makeReq(""), res as unknown as Response)
    expect(ids(res.body)).toHaveLength(4)
  })

  test("handleServices_featuredArbitraryString_treatedAsFalseReturnsAll", () => {
    const res = makeRes()
    handleServices(makeReq("?featured=yes"), res as unknown as Response)
    expect(ids(res.body)).toHaveLength(4)
  })
})

describe("handleServices AND across filters", () => {
  test("handleServices_sourceAndCategory_intersects", () => {
    const res = makeRes()
    handleServices(makeReq("?source=ddbj&category=search"), res as unknown as Response)
    expect(ids(res.body)).toEqual(["ddbj-txsearch"])
  })

  test("handleServices_sourceAndFeatured_intersects", () => {
    const res = makeRes()
    handleServices(makeReq("?source=dbcls&featured=true"), res as unknown as Response)
    expect(ids(res.body)).toEqual(["dbcls-togoid"])
  })

  test("handleServices_sourceCategoryFeatured_allThreeIntersect", () => {
    const res = makeRes()
    handleServices(
      makeReq("?source=dbcls&category=search&featured=1"),
      res as unknown as Response,
    )
    expect(ids(res.body)).toEqual(["dbcls-togoid"])
  })

  test("handleServices_andFiltersNoOverlap_returnsEmpty", () => {
    const res = makeRes()
    handleServices(
      makeReq("?source=ddbj&category=integration"),
      res as unknown as Response,
    )
    expect(res.body).toEqual([])
  })

  test("handleServices_featuredNonTruthyDoesNotConstrainAndResult", () => {
    const res = makeRes()
    // featured=0 は false 扱い → source フィルタのみが効く
    handleServices(makeReq("?source=ddbj&featured=0"), res as unknown as Response)
    expect(ids(res.body).sort()).toEqual(["ddbj-bioproject", "ddbj-txsearch"])
  })
})
