import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { describe, expect, test } from "vitest"

import type { NewsItem, NewsList, NewsSource } from "~/schemas/api-bff/news"

import { createCacheStore, loadCacheFromDisk } from "../../../../server/news/cache"
import { silentLogger } from "../../_helpers/silent-logger"

const item = (
  id: string,
  source: NewsSource,
  publishedAt: string,
): NewsItem => ({
  id,
  source,
  category: "announcement",
  featured: false,
  publishedAt,
  title: { ja: `${id} ja`, en: `${id} en` },
  db: [],
  rawTags: { ja: [], en: [] },
})

const ddbjItems = (): NewsList => [
  item("ddbj-2024", "ddbj", "2024-05-01T00:00:00+09:00"),
  item("ddbj-2022", "ddbj", "2022-01-01T00:00:00+09:00"),
]

const dbclsItems = (): NewsList => [
  item("dbcls-2025", "dbcls", "2025-03-01T00:00:00+09:00"),
  item("dbcls-2023", "dbcls", "2023-06-01T00:00:00+09:00"),
]

const withTempDir = async <T>(fn: (dir: string) => Promise<T>): Promise<T> => {
  const dir = await mkdtemp(path.join(tmpdir(), "news-cache-keep-"))
  try {
    return await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

describe("replaceItemsForSource (per-source atomic swap)", () => {
  test("replaceItemsForSource_replaceOtherSource_keepsExistingSourceItems", async () => {
    await withTempDir(async (dir) => {
      const cache = createCacheStore(dir, silentLogger)
      await cache.replaceItemsForSource("ddbj", ddbjItems(), "ddbj-sha")
      await cache.replaceItemsForSource("dbcls", dbclsItems(), "dbcls-sha")

      const ids = cache.list().map((n) => n.id)
      expect(ids).toContain("ddbj-2024")
      expect(ids).toContain("ddbj-2022")
      expect(ids).toContain("dbcls-2025")
      expect(ids).toContain("dbcls-2023")
      expect(ids).toHaveLength(4)
    })
  })

  test("replaceItemsForSource_mergedAcrossSources_isDateDesc", async () => {
    await withTempDir(async (dir) => {
      const cache = createCacheStore(dir, silentLogger)
      await cache.replaceItemsForSource("ddbj", ddbjItems(), "ddbj-sha")
      await cache.replaceItemsForSource("dbcls", dbclsItems(), "dbcls-sha")

      expect(cache.list().map((n) => n.id)).toEqual([
        "dbcls-2025",
        "ddbj-2024",
        "dbcls-2023",
        "ddbj-2022",
      ])
    })
  })

  test("replaceItemsForSource_resyncSameSource_replacesOnlyThatSource", async () => {
    await withTempDir(async (dir) => {
      const cache = createCacheStore(dir, silentLogger)
      await cache.replaceItemsForSource("ddbj", ddbjItems(), "ddbj-sha")
      await cache.replaceItemsForSource("dbcls", dbclsItems(), "dbcls-sha")

      await cache.replaceItemsForSource(
        "ddbj",
        [item("ddbj-2026", "ddbj", "2026-02-01T00:00:00+09:00")],
        "ddbj-sha-2",
      )

      const ids = cache.list().map((n) => n.id)
      expect(ids).not.toContain("ddbj-2024")
      expect(ids).not.toContain("ddbj-2022")
      expect(ids).toContain("ddbj-2026")
      expect(ids).toContain("dbcls-2025")
      expect(ids).toContain("dbcls-2023")
      expect(ids).toHaveLength(3)
    })
  })

  test("replaceItemsForSource_emptyOtherSource_doesNotDropExistingSource", async () => {
    await withTempDir(async (dir) => {
      const cache = createCacheStore(dir, silentLogger)
      await cache.replaceItemsForSource("ddbj", ddbjItems(), "ddbj-sha")
      await cache.replaceItemsForSource("dbcls", [], "dbcls-sha")

      const ids = cache.list({ source: ["ddbj"] }).map((n) => n.id)
      expect(ids).toEqual(["ddbj-2024", "ddbj-2022"])
    })
  })

  test("replaceItemsForSource_perSourceSha_isIndependent", async () => {
    await withTempDir(async (dir) => {
      const cache = createCacheStore(dir, silentLogger)
      await cache.replaceItemsForSource("ddbj", ddbjItems(), "ddbj-sha")
      await cache.replaceItemsForSource("dbcls", dbclsItems(), "dbcls-sha")

      expect(cache.getSyncShaForSource("ddbj")).toBe("ddbj-sha")
      expect(cache.getSyncShaForSource("dbcls")).toBe("dbcls-sha")

      await cache.replaceItemsForSource("dbcls", dbclsItems(), "dbcls-sha-2")
      expect(cache.getSyncShaForSource("ddbj")).toBe("ddbj-sha")
      expect(cache.getSyncShaForSource("dbcls")).toBe("dbcls-sha-2")
    })
  })

  test("replaceItemsForSource_nullSha_keepsOtherSourceShaIntact", async () => {
    await withTempDir(async (dir) => {
      const cache = createCacheStore(dir, silentLogger)
      await cache.replaceItemsForSource("ddbj", ddbjItems(), "ddbj-sha")
      await cache.replaceItemsForSource("dbcls", dbclsItems(), null)

      expect(cache.getSyncShaForSource("dbcls")).toBeNull()
      expect(cache.getSyncShaForSource("ddbj")).toBe("ddbj-sha")
    })
  })

  test("replaceItemsForSource_persistedAcrossSources_reloadsBothSources", async () => {
    await withTempDir(async (dir) => {
      const cache = createCacheStore(dir, silentLogger)
      await cache.replaceItemsForSource("ddbj", ddbjItems(), "ddbj-sha")
      await cache.replaceItemsForSource("dbcls", dbclsItems(), "dbcls-sha")

      const loaded = await loadCacheFromDisk(dir, silentLogger)
      expect(loaded.source).toBe("disk")
      expect(loaded.state.items.map((n) => n.id)).toEqual([
        "dbcls-2025",
        "ddbj-2024",
        "dbcls-2023",
        "ddbj-2022",
      ])
      expect(loaded.state.lastSyncSha.ddbj).toBe("ddbj-sha")
      expect(loaded.state.lastSyncSha.dbcls).toBe("dbcls-sha")
    })
  })
})
