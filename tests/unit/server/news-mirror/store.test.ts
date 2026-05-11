import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { loadFromDisk, persistToDisk } from "@/server/news-mirror/store"
import { NEWS_CACHE_SCHEMA_VERSION, type NewsSnapshot } from "@/server/news-mirror/types"

let dir: string

const sampleSnapshot = (overrides: Partial<NewsSnapshot> = {}): NewsSnapshot => ({
  items: [],
  fileShas: {},
  builtAt: "2026-05-11T00:00:00.000Z",
  sourceSha: "abc",
  schemaVersion: NEWS_CACHE_SCHEMA_VERSION,
  ...overrides,
})

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "news-store-"))
  process.env.NEWS_CACHE_DIR = dir
})

afterEach(async () => {
  delete process.env.NEWS_CACHE_DIR
  await rm(dir, { recursive: true, force: true })
})

describe("persistToDisk / loadFromDisk", () => {
  it("writes then reads a snapshot", async () => {
    const snap = sampleSnapshot({ sourceSha: "xyz", items: [] })
    await persistToDisk(snap)
    const loaded = await loadFromDisk()
    expect(loaded?.sourceSha).toBe("xyz")
  })

  it("returns null when the cache file is missing", async () => {
    expect(await loadFromDisk()).toBeNull()
  })

  it("returns null when schemaVersion mismatches", async () => {
    await writeFile(
      path.join(dir, "news-cache.json"),
      JSON.stringify({ ...sampleSnapshot(), schemaVersion: 999 }),
      "utf-8",
    )
    expect(await loadFromDisk()).toBeNull()
  })

  it("returns null when JSON is malformed", async () => {
    await writeFile(path.join(dir, "news-cache.json"), "{not json", "utf-8")
    expect(await loadFromDisk()).toBeNull()
  })

  it("writes atomically via .tmp then rename", async () => {
    const snap = sampleSnapshot({ sourceSha: "atomic" })
    await persistToDisk(snap)
    const final = await readFile(path.join(dir, "news-cache.json"), "utf-8")
    expect(final).toContain("atomic")
  })
})
