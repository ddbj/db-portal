import { describe, expect, test } from "vitest"

import {
  collectFromModules,
  formatValidationErrors,
  getDatabaseBySlug,
  listDatabases,
  validateAllDatabases,
} from "~/lib/content"
import { DatabaseContent } from "~/schemas/content/database-content"

const validDatabase = {
  slug: "sample",
  title: { ja: "サンプル", en: "Sample" },
  description: { ja: "説明", en: "Description" },
  body: { ja: "本文", en: "Body" },
  meta: {
    lastUpdated: "2026-05-21T00:00:00Z",
    relatedDbs: [],
    externalLinks: [],
  },
}

describe("collectFromModules", () => {
  test("collectFromModules_allValid_returnsOk", () => {
    const modules = {
      "/app/content/databases/sample/index.content.ts": { default: validDatabase },
    }
    const result = collectFromModules(DatabaseContent, modules)
    expect(result).toMatchObject({
      ok: true,
      items: [{ content: { slug: "sample" } }],
    })
  })

  test("collectFromModules_someInvalid_returnsErrors", () => {
    const modules = {
      "/app/content/databases/sample/index.content.ts": { default: validDatabase },
      "/app/content/databases/broken/index.content.ts": {
        default: { ...validDatabase, slug: "BROKEN" },
      },
    }
    const result = collectFromModules(DatabaseContent, modules)
    expect(result).toMatchObject({
      ok: false,
      errors: [{ filepath: expect.stringContaining("broken") }],
    })
  })

  test("collectFromModules_emptyModules_returnsOkWithEmptyItems", () => {
    const result = collectFromModules(DatabaseContent, {})
    expect(result).toEqual({ ok: true, items: [] })
  })

  test("collectFromModules_invalidLastUpdated_reportsError", () => {
    const modules = {
      "/x/bad.content.ts": {
        default: { ...validDatabase, meta: { ...validDatabase.meta, lastUpdated: "yesterday" } },
      },
    }
    const result = collectFromModules(DatabaseContent, modules)
    expect(result.ok).toBe(false)
  })
})

describe("formatValidationErrors", () => {
  test("formatValidationErrors_includesFilepathAndPath", () => {
    const modules = {
      "/x/bad.content.ts": {
        default: { ...validDatabase, slug: "WRONG" },
      },
    }
    const result = collectFromModules(DatabaseContent, modules)
    const errors = result.ok ? [] : result.errors
    const text = formatValidationErrors(errors)
    expect(text).toContain("/x/bad.content.ts")
    expect(text).toContain("slug")
  })
})

describe("getDatabaseBySlug / listDatabases / validateAllDatabases", () => {
  test("getDatabaseBySlug_unknownSlug_returnsUndefined", () => {
    expect(getDatabaseBySlug("nope")).toBeUndefined()
  })

  test("getDatabaseBySlug_bioproject_returnsContent", () => {
    const db = getDatabaseBySlug("bioproject")
    expect(db?.slug).toBe("bioproject")
    expect(db?.title.ja).toBe("BioProject")
  })

  test("listDatabases_includesBioprojectAndBiosample", () => {
    const slugs = listDatabases().map((d) => d.slug).sort()
    expect(slugs).toEqual(["biosample", "bioproject"].sort())
  })

  test("validateAllDatabases_returnsOk", () => {
    const result = validateAllDatabases()
    expect(result.ok).toBe(true)
  })
})
