import { describe, expect, test } from "vitest"

import { PageFrontmatter } from "../../../../app/schemas/content/page-content"

describe("PageFrontmatter", () => {
  test("PageFrontmatter_validInput_parses", () => {
    const parsed = PageFrontmatter.parse({
      title: "BioProject",
      description: "Research project metadata DB",
    })
    expect(parsed.title).toBe("BioProject")
    expect(parsed.description).toBe("Research project metadata DB")
  })

  test("PageFrontmatter_emptyTitle_throws", () => {
    expect(() =>
      PageFrontmatter.parse({ title: "", description: "desc" }),
    ).toThrow()
  })

  test("PageFrontmatter_emptyDescription_throws", () => {
    expect(() =>
      PageFrontmatter.parse({ title: "title", description: "" }),
    ).toThrow()
  })

  test("PageFrontmatter_missingTitle_throws", () => {
    expect(() =>
      PageFrontmatter.parse({ description: "desc" }),
    ).toThrow()
  })

  test("PageFrontmatter_missingDescription_throws", () => {
    expect(() =>
      PageFrontmatter.parse({ title: "title" }),
    ).toThrow()
  })

  test("PageFrontmatter_extraFields_stripsUnknown", () => {
    const parsed = PageFrontmatter.parse({
      title: "title",
      description: "desc",
      extra: "ignored",
    })
    expect(parsed).toEqual({ title: "title", description: "desc" })
  })
})
