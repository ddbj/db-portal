import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { describe, expect, test } from "vitest"

import type { NewsList } from "~/schemas/api-bff/news"

import { createCacheStore, loadCacheFromDisk } from "../../../../server/news/cache"

const silentLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

const makeItems = (): NewsList => [
  {
    id: "a-2024",
    source: "ddbj",
    category: "release",
    publishedAt: "2024-05-01T00:00:00+09:00",
    title: { ja: "あ 2024", en: "A 2024" },
    db: ["ddbj", "dra"],
    rawTags: { ja: ["リリース"], en: ["Release"] },
  },
  {
    id: "b-2023",
    source: "ddbj",
    category: "maintenance",
    publishedAt: "2023-12-31T00:00:00+09:00",
    title: { ja: "い 2023", en: "" },
    db: ["jga"],
    rawTags: { ja: ["メンテナンス"], en: [] },
  },
  {
    id: "c-2024",
    source: "ddbj",
    category: "announcement",
    publishedAt: "2024-01-15T00:00:00+09:00",
    title: { ja: "う 2024", en: "U 2024" },
    db: ["ddbj"],
    rawTags: { ja: ["重要"], en: ["Announcement"] },
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
  test("filter by category", async () => {
    await withTempDir(async (dir) => {
      const cache = createCacheStore(dir, silentLogger)
      await cache.replaceItems(makeItems(), { ja: "sha", en: "sha" })
      const released = cache.list({ category: ["release"] })
      expect(released).toHaveLength(1)
      expect(released[0]?.id).toBe("a-2024")
    })
  })

  test("filter by year", async () => {
    await withTempDir(async (dir) => {
      const cache = createCacheStore(dir, silentLogger)
      await cache.replaceItems(makeItems(), { ja: "sha", en: "sha" })
      expect(cache.list({ year: [2024] }).map((n) => n.id)).toEqual(["a-2024", "c-2024"])
    })
  })

  test("filter by service", async () => {
    await withTempDir(async (dir) => {
      const cache = createCacheStore(dir, silentLogger)
      await cache.replaceItems(makeItems(), { ja: "sha", en: "sha" })
      expect(cache.list({ service: ["dra"] }).map((n) => n.id)).toEqual(["a-2024"])
    })
  })

  test("filter by lang skips items without translation", async () => {
    await withTempDir(async (dir) => {
      const cache = createCacheStore(dir, silentLogger)
      await cache.replaceItems(makeItems(), { ja: "sha", en: "sha" })
      const enOnly = cache.list({ lang: "en" })
      expect(enOnly.map((n) => n.id)).toEqual(["a-2024", "c-2024"])
    })
  })

  test("persists to disk and reloads", async () => {
    await withTempDir(async (dir) => {
      const cache = createCacheStore(dir, silentLogger)
      await cache.replaceItems(makeItems(), { ja: "sha", en: "sha" })
      const loaded = await loadCacheFromDisk(dir, silentLogger)
      expect(loaded.source).toBe("disk")
      expect(loaded.state.items).toHaveLength(3)
    })
  })

  test("returns empty cache on schema mismatch", async () => {
    await withTempDir(async (dir) => {
      await mkdir(dir, { recursive: true })
      await writeFile(path.join(dir, "news.json"), JSON.stringify({ schemaVersion: 99 }), "utf8")
      const loaded = await loadCacheFromDisk(dir, silentLogger)
      expect(loaded.source).toBe("empty")
      expect(loaded.state.items).toHaveLength(0)
    })
  })

  test("returns empty cache when file is corrupt", async () => {
    await withTempDir(async (dir) => {
      await mkdir(dir, { recursive: true })
      await writeFile(path.join(dir, "news.json"), "not json", "utf8")
      const loaded = await loadCacheFromDisk(dir, silentLogger)
      expect(loaded.source).toBe("empty")
    })
  })

  test("returns empty cache when file does not exist", async () => {
    await withTempDir(async (dir) => {
      const loaded = await loadCacheFromDisk(dir, silentLogger)
      expect(loaded.source).toBe("empty")
    })
  })

  // 使わない import を避けるためのダミー (readFile を import している意図を示す)
  test("file contents are JSON", async () => {
    await withTempDir(async (dir) => {
      const cache = createCacheStore(dir, silentLogger)
      await cache.replaceItems(makeItems(), { ja: "sha", en: "sha" })
      const raw = await readFile(path.join(dir, "news.json"), "utf8")
      expect(() => JSON.parse(raw)).not.toThrow()
    })
  })
})
