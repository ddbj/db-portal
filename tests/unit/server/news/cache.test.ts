import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { describe, expect, test } from "vitest"

import type { NewsList } from "~/schemas/api-bff/news"

import { createCacheStore, loadCacheFromDisk } from "../../../../server/news/cache"
import { silentLogger } from "../../_helpers/silent-logger"

const makeItems = (): NewsList => [
  {
    id: "a-2024",
    source: "ddbj",
    category: "data-release",
    featured: false,
    publishedAt: "2024-05-01T00:00:00+09:00",
    title: { ja: "あ 2024", en: "A 2024" },
    db: ["ddbj", "dra"],
    rawTags: { ja: ["データ公開"], en: ["Data Release"] },
  },
  {
    id: "b-2023",
    source: "ddbj",
    category: "maintenance",
    featured: false,
    publishedAt: "2023-12-31T00:00:00+09:00",
    title: { ja: "い 2023", en: "" },
    db: ["jga"],
    rawTags: { ja: ["メンテナンス"], en: [] },
  },
  {
    id: "c-2024",
    source: "ddbj",
    category: "announcement",
    featured: true,
    publishedAt: "2024-01-15T00:00:00+09:00",
    title: { ja: "う 2024", en: "U 2024" },
    db: ["ddbj"],
    rawTags: { ja: ["お知らせ"], en: ["Announcement"] },
  },
  {
    id: "d-2024-en-only",
    source: "ddbj",
    category: "announcement",
    featured: false,
    publishedAt: "2024-03-10T00:00:00+09:00",
    title: { ja: "", en: "D 2024 (en only)" },
    db: ["ddbj"],
    rawTags: { ja: [], en: ["Announcement"] },
  },
]

const withTempDir = async <T>(fn: (dir: string) => Promise<T>): Promise<T> => {
  const dir = await mkdtemp(path.join(tmpdir(), "news-cache-"))
  try {
    return await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

describe("createCacheStore", () => {
  test("cacheList_categoryFilter_returnsOnlyMatchingItems", async () => {
    await withTempDir(async (dir) => {
      const cache = createCacheStore(dir, silentLogger)
      await cache.replaceItemsForSource("ddbj", makeItems(), "sha")
      const released = cache.list({ category: ["data-release"] })
      expect(released).toHaveLength(1)
      expect(released[0]?.id).toBe("a-2024")
    })
  })

  test("cacheList_yearFilter_returnsItemsPublishedInThatYear", async () => {
    await withTempDir(async (dir) => {
      const cache = createCacheStore(dir, silentLogger)
      await cache.replaceItemsForSource("ddbj", makeItems(), "sha")
      expect(cache.list({ year: [2024] }).map((n) => n.id)).toEqual([
        "a-2024",
        "d-2024-en-only",
        "c-2024",
      ])
    })
  })

  test("cacheList_serviceFilter_returnsItemsTaggedWithThatService", async () => {
    await withTempDir(async (dir) => {
      const cache = createCacheStore(dir, silentLogger)
      await cache.replaceItemsForSource("ddbj", makeItems(), "sha")
      expect(cache.list({ service: ["dra"] }).map((n) => n.id)).toEqual(["a-2024"])
    })
  })

  test("cacheList_enLang_skipsItemsWithoutEnTitle", async () => {
    await withTempDir(async (dir) => {
      const cache = createCacheStore(dir, silentLogger)
      await cache.replaceItemsForSource("ddbj", makeItems(), "sha")
      const enOnly = cache.list({ lang: "en" })
      expect(enOnly.map((n) => n.id)).toEqual(["a-2024", "d-2024-en-only", "c-2024"])
    })
  })

  test("cacheList_jaLang_skipsItemsWithoutJaTitle", async () => {
    await withTempDir(async (dir) => {
      const cache = createCacheStore(dir, silentLogger)
      await cache.replaceItemsForSource("ddbj", makeItems(), "sha")
      const jaOnly = cache.list({ lang: "ja" })
      expect(jaOnly.map((n) => n.id)).toEqual(["a-2024", "c-2024", "b-2023"])
    })
  })

  test("cache_writeThenReload_recoversAllItemsFromDisk", async () => {
    await withTempDir(async (dir) => {
      const cache = createCacheStore(dir, silentLogger)
      await cache.replaceItemsForSource("ddbj", makeItems(), "sha")
      const loaded = await loadCacheFromDisk(dir, silentLogger)
      expect(loaded.source).toBe("disk")
      expect(loaded.state.items).toHaveLength(4)
    })
  })

  test("loadCacheFromDisk_schemaVersionMismatch_returnsEmptyCache", async () => {
    await withTempDir(async (dir) => {
      await mkdir(dir, { recursive: true })
      await writeFile(path.join(dir, "news.json"), JSON.stringify({ schemaVersion: 99 }), "utf8")
      const loaded = await loadCacheFromDisk(dir, silentLogger)
      expect(loaded.source).toBe("empty")
      expect(loaded.state.items).toHaveLength(0)
    })
  })

  test("loadCacheFromDisk_corruptJson_returnsEmptyCache", async () => {
    await withTempDir(async (dir) => {
      await mkdir(dir, { recursive: true })
      await writeFile(path.join(dir, "news.json"), "not json", "utf8")
      const loaded = await loadCacheFromDisk(dir, silentLogger)
      expect(loaded.source).toBe("empty")
    })
  })

  test("loadCacheFromDisk_missingFile_returnsEmptyCache", async () => {
    await withTempDir(async (dir) => {
      const loaded = await loadCacheFromDisk(dir, silentLogger)
      expect(loaded.source).toBe("empty")
    })
  })
})
