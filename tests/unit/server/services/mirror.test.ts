import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { afterEach, beforeEach, describe, expect, test } from "vitest"

import type { ServerEnv } from "../../../../server/lib/env"
import { createServicesMirror, getActiveServicesCache } from "../../../../server/services/mirror"
import { silentLogger } from "../../_helpers/silent-logger"
import { dbclsJson, ddbjYaml } from "./_fixtures"

let cacheDir: string
let repoDir: string

const envFor = (dir: string): ServerEnv =>
  ({ DB_PORTAL_SERVICES_CACHE_DIR: dir }) as unknown as ServerEnv

const writeSources = async (yaml: string, json: string): Promise<void> => {
  await mkdir(path.join(repoDir, "_data"), { recursive: true })
  await mkdir(path.join(repoDir, "json"), { recursive: true })
  await writeFile(path.join(repoDir, "_data/services.yml"), yaml, "utf8")
  await writeFile(path.join(repoDir, "json/services.json"), json, "utf8")
}

beforeEach(async () => {
  cacheDir = await mkdtemp(path.join(tmpdir(), "svc-mirror-cache-"))
  repoDir = await mkdtemp(path.join(tmpdir(), "svc-mirror-repo-"))
})

afterEach(async () => {
  await rm(cacheDir, { recursive: true, force: true })
  await rm(repoDir, { recursive: true, force: true })
})

describe("services mirror", () => {
  test("init exposes the active cache", async () => {
    const mirror = createServicesMirror(envFor(cacheDir), silentLogger)
    await mirror.init()
    expect(getActiveServicesCache()).toBe(mirror.cache)
  })

  test("rebuildSource normalizes a source file into the cache", async () => {
    await writeSources(ddbjYaml, dbclsJson)
    const mirror = createServicesMirror(envFor(cacheDir), silentLogger)
    await mirror.init()
    await mirror.rebuildSource("ddbj", repoDir, "sha-1")
    await mirror.rebuildSource("dbcls", repoDir, "sha-1")
    expect(mirror.cache.list({ source: ["ddbj"] })).toHaveLength(5)
    expect(mirror.cache.list({ source: ["dbcls"] })).toHaveLength(3)
    expect(mirror.cache.getSyncShaForSource("ddbj")).toBe("sha-1")
  })

  test("rebuildSource is a no-op when the sha is unchanged", async () => {
    await writeSources(ddbjYaml, dbclsJson)
    const mirror = createServicesMirror(envFor(cacheDir), silentLogger)
    await mirror.init()
    await mirror.rebuildSource("ddbj", repoDir, "sha-1")
    // 同じ sha のまま source を 1 件に変えても再構築しない
    await writeFile(
      path.join(repoDir, "_data/services.yml"),
      "items:\n  - name: Solo\n    provider: DDBJ\n    tags: []\n",
      "utf8",
    )
    await mirror.rebuildSource("ddbj", repoDir, "sha-1")
    expect(mirror.cache.list({ source: ["ddbj"] })).toHaveLength(5)
    // sha が変われば再構築する
    await mirror.rebuildSource("ddbj", repoDir, "sha-2")
    expect(mirror.cache.list({ source: ["ddbj"] })).toHaveLength(1)
  })

  test("missing source file keeps existing items intact", async () => {
    await writeSources(ddbjYaml, dbclsJson)
    const mirror = createServicesMirror(envFor(cacheDir), silentLogger)
    await mirror.init()
    await mirror.rebuildSource("ddbj", repoDir, "sha-1")
    // ファイルが無い localDir で dbcls 再構築 → warn、既存 ddbj は維持
    const emptyRepo = await mkdtemp(path.join(tmpdir(), "svc-empty-"))
    await mirror.rebuildSource("dbcls", emptyRepo, "sha-x")
    expect(mirror.cache.list({ source: ["ddbj"] })).toHaveLength(5)
    expect(mirror.cache.list({ source: ["dbcls"] })).toHaveLength(0)
    await rm(emptyRepo, { recursive: true, force: true })
  })
})
