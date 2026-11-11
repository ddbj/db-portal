import { test } from "@fast-check/vitest"
import type { Request, Response } from "express"
import fc from "fast-check"
import { afterEach, describe, expect, vi } from "vitest"

import type { NewsItem, NewsList } from "~/schemas/api-bff/news"

import type { NewsFilter } from "../../../../server/news/cache"
import type * as MirrorModule from "../../../../server/news/mirror"

// handleNews reads the cache through getActiveNewsCache(). The mirror module
// holds FS / git state, so the cache it returns is the stub point.
const cacheHolder: { current: { list: (filter?: NewsFilter) => NewsList } | undefined } = {
  current: undefined,
}

vi.mock("../../../../server/news/mirror", async (importActual) => {
  const actual = await importActual<typeof MirrorModule>()

  return {
    ...actual,
    getActiveNewsCache: () => cacheHolder.current,
  }
})

const { handleNews } = await import("../../../../server/api/news")

const itemAt = (i: number): NewsItem => ({
  id: `n-${i}`,
  source: "ddbj",
  category: "announcement",
  featured: false,
  publishedAt: "2024-01-01T00:00:00+09:00",
  title: { ja: `見出し ${i}`, en: `Heading ${i}` },
  db: [],
  rawTags: { ja: [], en: [] },
})

const respond = (search: string, items: NewsList): unknown => {
  cacheHolder.current = { list: () => items }
  let body: unknown
  const res = {
    setHeader: () => res,
    status: () => res,
    json: (value: unknown) => {
      body = value

      return res
    },
  } as unknown as Response
  handleNews({ originalUrl: `/api/news${search}` } as unknown as Request, res)

  return body
}

const arbItems = fc.nat({ max: 40 }).map((count) => Array.from({ length: count }, (_, i) => itemAt(i)))

const POSITIVE_INTEGER = /^[1-9][0-9]*$/

afterEach(() => {
  cacheHolder.current = undefined
})

describe("handleNews limit PBT", () => {
  test.prop([arbItems, fc.integer({ min: 1, max: 60 })])(
    "limitPositiveInteger_returnsPrefixOfLengthMinOfLimitAndCount",
    (items, limit) => {
      const body = respond(`?limit=${limit}`, items) as NewsList
      expect(body).toHaveLength(Math.min(limit, items.length))
      expect(body).toEqual(items.slice(0, limit))
    },
  )

  test.prop([arbItems, fc.string().filter((value) => !POSITIVE_INTEGER.test(value))])(
    "limitNotPositiveInteger_returnsAllItems",
    (items, value) => {
      expect(respond(`?limit=${encodeURIComponent(value)}`, items)).toEqual(items)
    },
  )
})
