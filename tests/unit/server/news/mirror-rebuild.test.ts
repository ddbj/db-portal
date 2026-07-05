import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, beforeEach, describe, expect, test } from "vitest"

import { createCacheStore } from "../../../../server/news/cache"
import { emptyWhitelist } from "../../../../server/news/featured"
import { rebuildNewsForSource } from "../../../../server/news/mirror"
import { ddbjConfig } from "../../../../server/news/sources"
import { silentLogger } from "../../_helpers/silent-logger"

let cacheDir: string
let repoDir: string

beforeEach(async () => {
  cacheDir = await mkdtemp(path.join(tmpdir(), "news-mirror-cache-"))
  repoDir = await mkdtemp(path.join(tmpdir(), "news-mirror-repo-"))
})

afterEach(async () => {
  await rm(cacheDir, { recursive: true, force: true })
  await rm(repoDir, { recursive: true, force: true })
})

const cfgFor = (localDir: string) =>
  ddbjConfig("https://example.invalid/repo.git", "main", localDir)

const writePair = async (
  localDir: string,
  slug: string,
  publishedAt: string,
): Promise<void> => {
  await mkdir(path.join(localDir, "_news/ja"), { recursive: true })
  await mkdir(path.join(localDir, "_news/en"), { recursive: true })
  const frontmatter = (lang: "ja" | "en") =>
    [
      "---",
      `title: ${slug} ${lang}`,
      `date: ${publishedAt}`,
      "---",
      "",
      "body",
    ].join("\n")
  await writeFile(path.join(localDir, "_news/ja", `${slug}.md`), frontmatter("ja"), "utf8")
  await writeFile(path.join(localDir, "_news/en", `${slug}-e.md`), frontmatter("en"), "utf8")
}

describe("rebuildNewsForSource — read failure invariants", () => {
  test("rebuildNewsForSource_bothLangDirsMissing_keepsExistingItemsIntact", async () => {
    // 1) seed: lang dirs exist with one paired article -> rebuild with sha-1
    const cache = createCacheStore(cacheDir, silentLogger)
    await cache.initFromDisk()
    await writePair(repoDir, "2025-03-01-hello", "2025-03-01")
    await rebuildNewsForSource(cache, cfgFor(repoDir), emptyWhitelist(), "sha-1", silentLogger)
    expect(cache.list({ source: ["ddbj"] }).length).toBeGreaterThan(0)

    // 2) both lang dirs disappear -> next rebuild MUST NOT wipe existing items
    await rm(path.join(repoDir, "_news"), { recursive: true, force: true })
    await rebuildNewsForSource(cache, cfgFor(repoDir), emptyWhitelist(), "sha-2", silentLogger)

    expect(cache.list({ source: ["ddbj"] }).length).toBeGreaterThan(0)
  })

  test("rebuildNewsForSource_bothLangDirsMissing_doesNotAdvanceLastSyncSha", async () => {
    const cache = createCacheStore(cacheDir, silentLogger)
    await cache.initFromDisk()
    await writePair(repoDir, "2025-03-01-hello", "2025-03-01")
    await rebuildNewsForSource(cache, cfgFor(repoDir), emptyWhitelist(), "sha-1", silentLogger)
    expect(cache.getSyncShaForSource("ddbj")).toBe("sha-1")

    await rm(path.join(repoDir, "_news"), { recursive: true, force: true })
    await rebuildNewsForSource(cache, cfgFor(repoDir), emptyWhitelist(), "sha-2", silentLogger)

    // 次の poll で「sha 変化なし」 とならないよう lastSyncSha は据え置く
    expect(cache.getSyncShaForSource("ddbj")).toBe("sha-1")
  })

  test("rebuildNewsForSource_oneLangDirMissing_proceedsWithRebuild", async () => {
    // 片方の lang dir だけ失敗するのは upstream の通常運用揺れ。
    // この場合は rebuild を続行し sha を進める (両側失敗とは扱いを分ける)。
    const cache = createCacheStore(cacheDir, silentLogger)
    await cache.initFromDisk()
    await writePair(repoDir, "2025-03-01-hello", "2025-03-01")
    await rebuildNewsForSource(cache, cfgFor(repoDir), emptyWhitelist(), "sha-1", silentLogger)

    await rm(path.join(repoDir, "_news/en"), { recursive: true, force: true })
    await rebuildNewsForSource(cache, cfgFor(repoDir), emptyWhitelist(), "sha-2", silentLogger)

    expect(cache.getSyncShaForSource("ddbj")).toBe("sha-2")
  })

  test("rebuildNewsForSource_bothLangDirsPresentButEmpty_advancesShaAndClearsItems", async () => {
    // 「dir はあるが .md が 0 件」 は upstream が news を本当に空にした正当な状態。
    // read 失敗とは区別し、 cache 更新かつ sha 前進する。
    const cache = createCacheStore(cacheDir, silentLogger)
    await cache.initFromDisk()
    await writePair(repoDir, "2025-03-01-hello", "2025-03-01")
    await rebuildNewsForSource(cache, cfgFor(repoDir), emptyWhitelist(), "sha-1", silentLogger)

    // 中身だけ消して dir は残す
    await rm(path.join(repoDir, "_news/ja"), { recursive: true, force: true })
    await rm(path.join(repoDir, "_news/en"), { recursive: true, force: true })
    await mkdir(path.join(repoDir, "_news/ja"), { recursive: true })
    await mkdir(path.join(repoDir, "_news/en"), { recursive: true })
    await rebuildNewsForSource(cache, cfgFor(repoDir), emptyWhitelist(), "sha-2", silentLogger)

    expect(cache.list({ source: ["ddbj"] })).toHaveLength(0)
    expect(cache.getSyncShaForSource("ddbj")).toBe("sha-2")
  })
})
