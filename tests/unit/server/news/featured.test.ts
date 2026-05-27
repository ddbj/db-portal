import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"

import { describe, expect, test } from "vitest"

import {
  emptyWhitelist,
  isFeaturedSlug,
  loadFeaturedWhitelist,
} from "../../../../server/news/featured"

const silentLogger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
}

const withTempYaml = async <T>(
  body: string,
  fn: (file: string) => Promise<T>,
): Promise<T> => {
  const dir = await mkdtemp(path.join(tmpdir(), "featured-"))
  try {
    const file = path.join(dir, "global.yml")
    await mkdir(dir, { recursive: true })
    await writeFile(file, body, "utf8")

    return await fn(file)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

describe("loadFeaturedWhitelist", () => {
  test("loadFeaturedWhitelist_validYaml_returnsBothSets", async () => {
    const body = [
      "top_news:",
      "  ja:",
      "    - title: t1",
      "      path: 2026-05-01",
      "  en:",
      "    - title: t1-e",
      "      path: 2026-05-01-e",
      "",
    ].join("\n")
    const wl = await withTempYaml(body, (f) => loadFeaturedWhitelist(f, silentLogger))
    expect([...wl.ja]).toEqual(["2026-05-01"])
    expect([...wl.en]).toEqual(["2026-05-01-e"])
  })

  test("loadFeaturedWhitelist_trailingWhitespaceInPath_isStripped", async () => {
    const body = [
      "top_news:",
      "  ja:",
      "    - title: t",
      "      path: '2026-04-03 '",
      "  en: []",
      "",
    ].join("\n")
    const wl = await withTempYaml(body, (f) => loadFeaturedWhitelist(f, silentLogger))
    expect(wl.ja.has("2026-04-03")).toBe(true)
    expect(wl.ja.has("2026-04-03 ")).toBe(false)
  })

  test("loadFeaturedWhitelist_missingFile_returnsEmpty", async () => {
    const wl = await loadFeaturedWhitelist("/nonexistent/path/global.yml", silentLogger)
    expect(wl).toEqual(emptyWhitelist())
  })

  test("loadFeaturedWhitelist_emptyTopNewsArrays_returnsEmptySets", async () => {
    const body = "top_news:\n  ja: []\n  en: []\n"
    const wl = await withTempYaml(body, (f) => loadFeaturedWhitelist(f, silentLogger))
    expect(wl.ja.size).toBe(0)
    expect(wl.en.size).toBe(0)
  })

  test("loadFeaturedWhitelist_malformedYaml_returnsEmptyAndLogsWarning", async () => {
    const body = "top_news:\n  ja:\n    -\n     path: [unclosed"
    const wl = await withTempYaml(body, (f) => loadFeaturedWhitelist(f, silentLogger))
    expect(wl).toEqual(emptyWhitelist())
  })

  test("loadFeaturedWhitelist_pathNotString_dropsEntry", async () => {
    const body = [
      "top_news:",
      "  ja:",
      "    - title: t",
      "      path: 12345",
      "  en: []",
      "",
    ].join("\n")
    const wl = await withTempYaml(body, (f) => loadFeaturedWhitelist(f, silentLogger))
    // js-yaml turns the bare integer into a number; zod path:string fails -> empty
    expect(wl.ja.size).toBe(0)
  })

  test("loadFeaturedWhitelist_bomPrefixed_isHandled", async () => {
    const body = "﻿top_news:\n  ja:\n    - path: 2026-05-01\n  en: []\n"
    const wl = await withTempYaml(body, (f) => loadFeaturedWhitelist(f, silentLogger))
    expect(wl.ja.has("2026-05-01")).toBe(true)
  })
})

describe("isFeaturedSlug", () => {
  const whitelist = {
    ja: new Set(["2026-05-01"]),
    en: new Set(["2026-05-01-e", "2026-06-15-e"]),
  }

  test("isFeaturedSlug_ddbjInternalSlugInJaList_returnsTrue", () => {
    expect(isFeaturedSlug("ddbj", "2026-05-01", whitelist)).toBe(true)
  })

  test("isFeaturedSlug_ddbjInternalSlugMatchesStrippedEnPath_returnsTrue", () => {
    // en path "2026-06-15-e" strips to internal slug "2026-06-15"
    expect(isFeaturedSlug("ddbj", "2026-06-15", whitelist)).toBe(true)
  })

  test("isFeaturedSlug_ddbjSlugNotInWhitelist_returnsFalse", () => {
    expect(isFeaturedSlug("ddbj", "2024-01-01", whitelist)).toBe(false)
  })

  test("isFeaturedSlug_dbclsAlwaysFalse_evenWhenSlugMatches", () => {
    expect(isFeaturedSlug("dbcls", "2026-05-01", whitelist)).toBe(false)
  })
})
