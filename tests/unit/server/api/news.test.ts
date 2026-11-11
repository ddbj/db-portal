import type { Request, Response } from "express"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import type { NewsList } from "~/schemas/api-bff/news"

import type { NewsFilter } from "../../../../server/news/cache"
import type * as MirrorModule from "../../../../server/news/mirror"

// Boundary seam between the HTTP handler and the news-mirror subsystem.
// handleNews only consumes getActiveNewsCache() + cache.list(filter); the
// mirror module (a stateful in-memory store backed by FS/git) is external to
// the parsing logic under test, so it is the legitimate stub point.
const cacheHolder: { current: StubCache | undefined } = { current: undefined }

vi.mock("../../../../server/news/mirror", async (importActual) => {
  const actual = await importActual<typeof MirrorModule>()

  return {
    ...actual,
    getActiveNewsCache: () => cacheHolder.current,
  }
})

const { handleNews } = await import("../../../../server/api/news")

type StubCache = {
  list: (filter?: NewsFilter) => NewsList
}

const SENTINEL_ITEMS: NewsList = [
  {
    id: "sentinel",
    source: "ddbj",
    category: "announcement",
    featured: false,
    publishedAt: "2024-01-01T00:00:00+09:00",
    title: { ja: "見出し", en: "Heading" },
    db: [],
    rawTags: { ja: [], en: [] },
  },
]

type CapturedResponse = {
  res: Response
  headers: Record<string, string>
  statusCode: number | undefined
  body: unknown
}

const fakeResponse = (): CapturedResponse => {
  const captured: CapturedResponse = {
    res: undefined as unknown as Response,
    headers: {},
    statusCode: undefined,
    body: undefined,
  }
  const res = {
    setHeader(name: string, value: string): Response {
      captured.headers[name] = value

      return res
    },
    status(code: number): Response {
      captured.statusCode = code

      return res
    },
    json(body: unknown): Response {
      captured.body = body

      return res
    },
  } as unknown as Response
  captured.res = res

  return captured
}

const fakeRequest = (originalUrl: string): Request =>
  ({ originalUrl }) as unknown as Request

// Drives the real handler + real query parsing, returning the NewsFilter that
// the handler built and handed to cache.list.
const filterFor = (search: string): NewsFilter => {
  const calls: (NewsFilter | undefined)[] = []
  cacheHolder.current = {
    list: (filter) => {
      calls.push(filter)

      return SENTINEL_ITEMS
    },
  }
  const out = fakeResponse()
  handleNews(fakeRequest(`/api/news${search}`), out.res)
  expect(calls).toHaveLength(1)

  return calls[0] as NewsFilter
}

beforeEach(() => {
  cacheHolder.current = undefined
})

afterEach(() => {
  cacheHolder.current = undefined
})

describe("handleNews query parsing", () => {
  test("handleNews_yearNonNumeric_dropsYear", () => {
    expect(filterFor("?year=abc").year).toEqual([])
  })

  test("handleNews_yearAtOrBelow1900_dropsYear", () => {
    expect(filterFor("?year=1800").year).toEqual([])
    expect(filterFor("?year=1900").year).toEqual([])
  })

  test("handleNews_yearJustAbove1900_keepsYear", () => {
    expect(filterFor("?year=1901").year).toEqual([1901])
  })

  test("handleNews_yearFloat_dropsNonIntegerYear", () => {
    expect(filterFor("?year=2024.5").year).toEqual([])
  })

  test("handleNews_yearMixedList_keepsOnlyValidYears", () => {
    expect(filterFor("?year=abc,2024,1800,2023").year).toEqual([2024, 2023])
  })

  test("handleNews_serviceUppercase_lowercasesForDbMatch", () => {
    expect(filterFor("?service=DRA").service).toEqual(["dra"])
  })

  test("handleNews_serviceMixedCaseList_lowercasesEachEntry", () => {
    expect(filterFor("?service=DRA,Jga").service).toEqual(["dra", "jga"])
  })

  test("handleNews_langInvalid_isIgnored", () => {
    expect(filterFor("?lang=fr").lang).toBeUndefined()
    expect(filterFor("?lang=JA").lang).toBeUndefined()
    expect(filterFor("?lang=").lang).toBeUndefined()
  })

  test("handleNews_langJaOrEn_isKept", () => {
    expect(filterFor("?lang=ja").lang).toBe("ja")
    expect(filterFor("?lang=en").lang).toBe("en")
  })

  test("handleNews_commaSeparatedSource_trimsWhitespace", () => {
    expect(filterFor("?source=ddbj%20,%20dbcls").source).toEqual(["ddbj", "dbcls"])
  })

  test("handleNews_unknownSource_isDroppedByEnumGuard", () => {
    expect(filterFor("?source=ddbj,nope").source).toEqual(["ddbj"])
  })

  test("handleNews_emptyCommaEntries_areDropped", () => {
    expect(filterFor("?service=,,dra,,").service).toEqual(["dra"])
  })

  test("handleNews_unknownCategory_isDroppedByEnumGuard", () => {
    expect(filterFor("?category=event,bogus").category).toEqual(["event"])
  })

  test("handleNews_noQueryParams_buildsEmptyFilterLists", () => {
    const filter = filterFor("")
    expect(filter.lang).toBeUndefined()
    expect(filter.source).toEqual([])
    expect(filter.category).toEqual([])
    expect(filter.year).toEqual([])
    expect(filter.service).toEqual([])
    expect(filter.featured).toBe(false)
  })

  test("handleNews_featuredTrueOrOne_setsFeaturedFilter", () => {
    expect(filterFor("?featured=true").featured).toBe(true)
    expect(filterFor("?featured=1").featured).toBe(true)
  })

  test("handleNews_featuredOtherValues_leavesFeaturedOff", () => {
    for (const value of ["false", "0", "TRUE", "True", "yes", "", "true,1", " true"]) {
      expect(filterFor(`?featured=${encodeURIComponent(value)}`).featured).toBe(false)
    }
  })
})

describe("handleNews response envelope", () => {
  test("handleNews_cacheUndefined_returns200WithEmptyArray", () => {
    cacheHolder.current = undefined
    const out = fakeResponse()
    handleNews(fakeRequest("/api/news?year=2024"), out.res)
    expect(out.statusCode).toBe(200)
    expect(out.body).toEqual([])
  })

  test("handleNews_cacheUndefined_stillSetsCacheControlHeader", () => {
    cacheHolder.current = undefined
    const out = fakeResponse()
    handleNews(fakeRequest("/api/news"), out.res)
    expect(out.headers["Cache-Control"]).toBe("public, max-age=60")
  })

  test("handleNews_cachePresent_setsCacheControlHeaderAndReturnsItems", () => {
    cacheHolder.current = { list: () => SENTINEL_ITEMS }
    const out = fakeResponse()
    handleNews(fakeRequest("/api/news"), out.res)
    expect(out.headers["Cache-Control"]).toBe("public, max-age=60")
    expect(out.statusCode).toBe(200)
    expect(out.body).toBe(SENTINEL_ITEMS)
  })

  test("handleNews_cacheUndefined_neverInvokesList", () => {
    const spy = vi.fn<(filter?: NewsFilter) => NewsList>(() => SENTINEL_ITEMS)
    cacheHolder.current = { list: spy }
    const undefinedHolder = fakeResponse()
    cacheHolder.current = undefined
    handleNews(fakeRequest("/api/news?year=2024"), undefinedHolder.res)
    expect(spy).not.toHaveBeenCalled()
  })

  test("handleNews_cachePresent_passesAllParsedFacetsInOneFilter", () => {
    const filter = filterFor(
      "?lang=en&source=ddbj,dbcls&category=event,maintenance&year=2024,1800&service=DRA,Jga",
    )
    expect(filter).toEqual({
      lang: "en",
      source: ["ddbj", "dbcls"],
      category: ["event", "maintenance"],
      year: [2024],
      service: ["dra", "jga"],
      featured: false,
    })
  })
})

const makeList = (count: number): NewsList =>
  Array.from({ length: count }, (_, i) => ({
    ...SENTINEL_ITEMS[0]!,
    id: `n-${i + 1}`,
  }))

const responseFor = (search: string, items: NewsList): NewsList => {
  cacheHolder.current = { list: () => items }
  const out = fakeResponse()
  handleNews(fakeRequest(`/api/news${search}`), out.res)
  expect(out.statusCode).toBe(200)

  return out.body as NewsList
}

describe("handleNews limit", () => {
  test("handleNews_limitPositiveInteger_returnsFirstNItemsInOrder", () => {
    const items = makeList(8)
    expect(responseFor("?limit=5", items)).toEqual(items.slice(0, 5))
  })

  test("handleNews_limitOne_returnsOnlyFirstItem", () => {
    const items = makeList(3)
    expect(responseFor("?limit=1", items)).toEqual([items[0]])
  })

  test("handleNews_limitEqualToCount_returnsAllItems", () => {
    const items = makeList(5)
    expect(responseFor("?limit=5", items)).toEqual(items)
  })

  test("handleNews_limitAboveCount_returnsAllItems", () => {
    const items = makeList(3)
    expect(responseFor("?limit=100", items)).toEqual(items)
  })

  test("handleNews_limitOnEmptyList_returnsEmpty", () => {
    expect(responseFor("?limit=5", [])).toEqual([])
  })

  test("handleNews_limitNotPositiveInteger_isIgnored", () => {
    const items = makeList(4)
    for (const value of ["0", "-1", "1.5", "abc", "", "05", "1e2", " 5", "5abc", "+3", "0x2"]) {
      expect(responseFor(`?limit=${encodeURIComponent(value)}`, items)).toEqual(items)
    }
  })

  test("handleNews_limitBeyondSafeInteger_isIgnored", () => {
    const items = makeList(4)
    expect(responseFor("?limit=99999999999999999999", items)).toEqual(items)
  })

  test("handleNews_limitWithFilters_slicesFilteredResult", () => {
    const filtered = makeList(6)
    const calls: (NewsFilter | undefined)[] = []
    cacheHolder.current = {
      list: (filter) => {
        calls.push(filter)

        return filtered
      },
    }
    const out = fakeResponse()
    handleNews(fakeRequest("/api/news?featured=true&limit=2"), out.res)
    expect(calls[0]?.featured).toBe(true)
    expect(out.body).toEqual(filtered.slice(0, 2))
  })
})
