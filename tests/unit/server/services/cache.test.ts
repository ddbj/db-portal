import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, beforeEach, describe, expect, test } from "vitest"

import type { ServiceItem, ServiceList } from "~/schemas/api-bff/service"

import { createCacheStore, loadCacheFromDisk } from "../../../../server/services/cache"
import { silentLogger } from "./_fixtures"

const item = (over: Partial<ServiceItem> & Pick<ServiceItem, "id" | "source" | "name">): ServiceItem => ({
  description: { ja: "", en: "" },
  categories: ["other"],
  rawCategories: [],
  featuredTop: false,
  ...over,
})

const ddbjItems: ServiceList = [
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
  }),
]

const dbclsItems: ServiceList = [
  item({
    id: "dbcls-togoid",
    source: "dbcls",
    name: { ja: "TogoID", en: "TogoID" },
    categories: ["integration", "search"],
    featuredTop: true,
  }),
]

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "svc-cache-"))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

describe("services cache store", () => {
  test("list_initial_isEmpty", () => {
    const cache = createCacheStore(dir, silentLogger)
    expect(cache.list()).toEqual([])
    expect(cache.getSyncShaForSource("ddbj")).toBeNull()
  })

  test("list_bothSources_keepsAllSortedByName", async () => {
    const cache = createCacheStore(dir, silentLogger)
    await cache.replaceItemsForSource("ddbj", ddbjItems, "sha-ddbj")
    await cache.replaceItemsForSource("dbcls", dbclsItems, "sha-dbcls")
    expect(cache.list().map((s) => s.name.en)).toEqual(["BioProject", "TogoID", "TXSearch"])
    expect(cache.getSyncShaForSource("ddbj")).toBe("sha-ddbj")
    expect(cache.getSyncShaForSource("dbcls")).toBe("sha-dbcls")
  })

  test("replaceItemsForSource_oneSource_replacesOnlyThatSource", async () => {
    const cache = createCacheStore(dir, silentLogger)
    await cache.replaceItemsForSource("ddbj", ddbjItems, "sha-ddbj")
    await cache.replaceItemsForSource("dbcls", dbclsItems, "sha-dbcls")
    await cache.replaceItemsForSource("ddbj", [ddbjItems[0]!], "sha-ddbj-2")
    const ids = cache.list().map((s) => s.id).sort()
    expect(ids).toEqual(["dbcls-togoid", "ddbj-bioproject"])
    expect(cache.getSyncShaForSource("dbcls")).toBe("sha-dbcls")
  })

  test("list_sourceFilter_returnsOnlyMatchingSource", async () => {
    const cache = createCacheStore(dir, silentLogger)
    await cache.replaceItemsForSource("ddbj", ddbjItems, "s")
    await cache.replaceItemsForSource("dbcls", dbclsItems, "s")
    expect(cache.list({ source: ["dbcls"] }).map((s) => s.id)).toEqual(["dbcls-togoid"])
  })

  test("list_categoryFilter_orSemanticsOverMultiCategory", async () => {
    const cache = createCacheStore(dir, silentLogger)
    await cache.replaceItemsForSource("ddbj", ddbjItems, "s")
    await cache.replaceItemsForSource("dbcls", dbclsItems, "s")
    const ids = cache.list({ category: ["search"] }).map((s) => s.id).sort()
    expect(ids).toEqual(["dbcls-togoid", "ddbj-txsearch"])
  })

  test("list_featuredFilter_returnsOnlyFeatured", async () => {
    const cache = createCacheStore(dir, silentLogger)
    await cache.replaceItemsForSource("ddbj", ddbjItems, "s")
    await cache.replaceItemsForSource("dbcls", dbclsItems, "s")
    const ids = cache.list({ featured: true }).map((s) => s.id).sort()
    expect(ids).toEqual(["dbcls-togoid", "ddbj-bioproject"])
  })

  test("initFromDisk_afterPersist_restoresState", async () => {
    const cache = createCacheStore(dir, silentLogger)
    await cache.replaceItemsForSource("ddbj", ddbjItems, "sha-ddbj")
    const reloaded = createCacheStore(dir, silentLogger)
    await reloaded.initFromDisk()
    expect(reloaded.list().map((s) => s.id)).toEqual(["ddbj-bioproject", "ddbj-txsearch"])
    expect(reloaded.getSyncShaForSource("ddbj")).toBe("sha-ddbj")
  })

  test("loadCacheFromDisk_missingFile_loadsEmpty", async () => {
    const loaded = await loadCacheFromDisk(dir, silentLogger)
    expect(loaded.source).toBe("empty")
    expect(loaded.state.items).toEqual([])
  })

  test("loadCacheFromDisk_corruptJson_loadsEmpty", async () => {
    await writeFile(path.join(dir, "services.json"), "{ not json", "utf8")
    const loaded = await loadCacheFromDisk(dir, silentLogger)
    expect(loaded.source).toBe("empty")
  })

  test("loadCacheFromDisk_schemaMismatch_loadsEmpty", async () => {
    await writeFile(
      path.join(dir, "services.json"),
      JSON.stringify({ schemaVersion: 99, lastSyncSha: {}, lastFetchedAt: "x", items: [] }),
      "utf8",
    )
    const loaded = await loadCacheFromDisk(dir, silentLogger)
    expect(loaded.source).toBe("empty")
  })
})
