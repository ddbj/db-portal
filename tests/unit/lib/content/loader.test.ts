import { describe, expect, test } from "vitest"

import {
  collectFromModules,
  formatValidationErrors,
  getPageByPath,
  listAllPages,
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

describe("getPageByPath / listAllPages / validateAllPages", () => {
  test("getPageByPath_unknownPath_returnsUndefined", () => {
    expect(getPageByPath("/nope")).toBeUndefined()
  })

  test("getPageByPath_bioproject_returnsContent", () => {
    const page = getPageByPath("/bioproject")
    expect(page?.slug).toBe("bioproject")
    expect(page?.frontmatter.ja.title).toBe("BioProject")
  })

  test("listAllPages_includesAllDatabases", () => {
    const paths = listAllPages().map((p) => p.urlPath)
    for (const slug of [
      "bioproject", "biosample", "ddbj", "dra", "gea",
      "humandbs", "jga", "metabobank",
    ]) {
      expect(paths).toContain(`/${slug}`)
    }
  })

  test("listAllPages_includesNestedPolicyTermOfUse", () => {
    const paths = listAllPages().map((p) => p.urlPath)
    expect(paths).toContain("/policy")
    expect(paths).toContain("/policy/term-of-use")
  })

  test("validateAllPages_returnsOk", () => {
    const result = validateAllPages()
    expect(result.ok).toBe(true)
  })

  test("getPageByPath_bioproject_hasEnglishVersion", () => {
    const page = getPageByPath("/bioproject")
    expect(page?.frontmatter.en).toBeDefined()
    expect(page?.frontmatter.en?.title).toBe("BioProject")
    expect(page?.html.en).toBeDefined()
  })

  test("getPageByPath_bioproject_htmlContainsRenderedMarkdown", () => {
    const page = getPageByPath("/bioproject")
    expect(page?.html.ja).toContain("<h2 id=")
    expect(page?.html.ja).toContain("BioProject とは")
  })
})
