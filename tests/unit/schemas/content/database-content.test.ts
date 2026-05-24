import { describe, expect, test } from "vitest"

import { DatabaseContent } from "../../../../app/schemas/content/database-content"

const validBase = {
  slug: "bioproject",
  title: { ja: "BioProject", en: "BioProject" },
  description: { ja: "研究プロジェクトのメタデータ DB", en: "Research project metadata DB" },
  body: { ja: "本文 ja", en: "Body en" },
  meta: {
    lastUpdated: "2026-05-21T00:00:00Z",
    relatedDbs: ["biosample"],
    externalLinks: [
      { label: { ja: "INSDC BioProject", en: "INSDC BioProject" }, href: "https://example.test/bioproject/" },
    ],
  },
}

describe("DatabaseContent", () => {
  test("DatabaseContent_validInput_parses", () => {
    const parsed = DatabaseContent.parse(validBase)
    expect(parsed.slug).toBe("bioproject")
    expect(parsed.meta.relatedDbs).toEqual(["biosample"])
  })

  test("DatabaseContent_slugWithUpperCase_throws", () => {
    expect(() => DatabaseContent.parse({ ...validBase, slug: "BioProject" })).toThrow()
  })

  test("DatabaseContent_missingDescriptionEn_throws", () => {
    expect(() =>
      DatabaseContent.parse({
        ...validBase,
        description: { ja: "ja のみ", en: "" },
      }),
    ).toThrow()
  })

  test("DatabaseContent_invalidExternalLinkHref_throws", () => {
    expect(() =>
      DatabaseContent.parse({
        ...validBase,
        meta: {
          ...validBase.meta,
          externalLinks: [{ label: { ja: "x", en: "x" }, href: "not-a-url" }],
        },
      }),
    ).toThrow()
  })

  test("DatabaseContent_invalidLastUpdated_throws", () => {
    expect(() =>
      DatabaseContent.parse({ ...validBase, meta: { ...validBase.meta, lastUpdated: "2026-05-21" } }),
    ).toThrow()
  })
})
