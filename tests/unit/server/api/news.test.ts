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
    })
  })
})
