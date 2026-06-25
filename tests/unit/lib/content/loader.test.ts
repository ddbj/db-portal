import { describe, expect, test } from "vitest"

import {
  collectFromModules,
  formatValidationErrors,
  getPageBySlug,
  listPagesBySection,
  validateAllPages,
} from "~/lib/content"
import { PageFrontmatter } from "~/schemas/content/page-content"
import { ServiceContent } from "~/schemas/content/service-content"

describe("collectFromModules", () => {
  test("collectFromModules_allValid_returnsOk", () => {
    const modules = {
      "/app/content/services/sample/index.content.ts": {
        default: {
          id: "sample",
          title: { ja: "サンプル", en: "Sample" },
          description: { ja: "説明", en: "Description" },
          top: { category: "primary-service", order: 0 },
          link: { kind: "internal", to: "/sample" },
        },
      },
    }
    const result = collectFromModules(ServiceContent, modules)
    expect(result.ok).toBe(true)
  })
})

describe("formatValidationErrors", () => {
  test("formatValidationErrors_includesFilepathAndPath", () => {
    const parsed = PageFrontmatter.safeParse({ title: "" })
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    const errors = [{ filepath: "/x/bad.md", error: parsed.error }]
    const text = formatValidationErrors(errors)
    expect(text).toContain("/x/bad.md")
    expect(text).toContain("title")
  })
})

describe("getPageBySlug / listPagesBySection / validateAllPages", () => {
  test("getPageBySlug_unknownSlug_returnsUndefined", () => {
    expect(getPageBySlug("databases", "nope")).toBeUndefined()
  })

  test("getPageBySlug_bioproject_returnsContent", () => {
    const page = getPageBySlug("databases", "bioproject")
    expect(page?.slug).toBe("bioproject")
    expect(page?.frontmatter.ja.title).toBe("BioProject")
  })

  test("listPagesBySection_includesAllDatabases", () => {
    const slugs = listPagesBySection("databases").map((p) => p.slug).sort()
    expect(slugs).toEqual([
      "bioproject", "biosample", "ddbj", "dra", "eva", "gea",
      "humandbs", "jga", "jpost", "metabobank", "nsss", "togovar",
    ].sort())
  })

  test("validateAllPages_returnsOk", () => {
    const result = validateAllPages()
    expect(result.ok).toBe(true)
  })

  test("getPageBySlug_bioproject_hasEnglishVersion", () => {
    const page = getPageBySlug("databases", "bioproject")
    expect(page?.frontmatter.en).toBeDefined()
    expect(page?.frontmatter.en?.title).toBe("BioProject")
    expect(page?.html.en).toBeDefined()
  })

  test("getPageBySlug_bioproject_htmlContainsRenderedMarkdown", () => {
    const page = getPageBySlug("databases", "bioproject")
    expect(page?.html.ja).toContain("<h2 id=")
    expect(page?.html.ja).toContain("BioProject とは")
  })
})
