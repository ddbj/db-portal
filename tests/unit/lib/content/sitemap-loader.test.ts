import { describe, expect, test } from "vitest"

import {
  getSitemap,
  listAllPages,
  validateSitemap,
  validateSitemapDoc,
} from "~/lib/content"

const knownFromCorpus = (): Set<string> => {
  const set = new Set<string>()
  for (const page of listAllPages()) {
    if (page.urlPath.startsWith("/_dev")) continue
    set.add(page.urlPath)
  }

  return set
}

const minimalDoc = (paths: string[]): unknown => ({
  sections: [
    {
      id: "primary",
      heading: { ja: "セクション", en: "Section" },
      items: paths.map((p) => ({ kind: "internal", path: p })),
    },
  ],
})

describe("validateSitemapDoc - schema", () => {
  test("validateSitemapDoc_validInput_returnsOk", () => {
    const knownPaths = new Set(["/foo", "/bar"])
    const result = validateSitemapDoc(minimalDoc(["/foo", "/bar"]), knownPaths)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.doc.sections).toHaveLength(1)
    expect(result.doc.sections[0]?.items).toHaveLength(2)
  })

  test("validateSitemapDoc_emptyItems_fails", () => {
    const doc = {
      sections: [
        { id: "primary", heading: { ja: "あ", en: "A" }, items: [] },
      ],
    }
    const result = validateSitemapDoc(doc, new Set())
    expect(result.ok).toBe(false)
  })

  test("validateSitemapDoc_pathMissingLeadingSlash_fails", () => {
    const doc = {
      sections: [
        {
          id: "primary",
          heading: { ja: "あ", en: "A" },
          items: [{ kind: "internal", path: "foo" }],
        },
      ],
    }
    const result = validateSitemapDoc(doc, new Set(["/foo"]))
    expect(result.ok).toBe(false)
  })

  test("validateSitemapDoc_externalMissingEnLabel_fails", () => {
    const doc = {
      sections: [
        {
          id: "primary",
          heading: { ja: "あ", en: "A" },
          items: [
            {
              kind: "external",
              url: "https://example.com",
              label: { ja: "外部" },
            },
          ],
        },
      ],
    }
    const result = validateSitemapDoc(doc, new Set())
    expect(result.ok).toBe(false)
  })

  test("validateSitemapDoc_discriminatedUnion_rejectsMixedShape", () => {
    const doc = {
      sections: [
        {
          id: "primary",
          heading: { ja: "あ", en: "A" },
          items: [{ kind: "internal", url: "https://example.com" }],
        },
      ],
    }
    const result = validateSitemapDoc(doc, new Set())
    expect(result.ok).toBe(false)
  })
})

describe("validateSitemapDoc - orphan detection", () => {
  test("validateSitemapDoc_orphanInJson_reportsMissingPage", () => {
    const knownPaths = new Set(["/foo"])
    const result = validateSitemapDoc(
      minimalDoc(["/foo", "/does-not-exist"]),
      knownPaths,
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    const messages = result.errors.map((e) => e.message).join("\n")
    expect(messages).toContain("/does-not-exist")
    expect(messages).toContain("no matching page")
  })

  test("validateSitemapDoc_orphanInCorpus_reportsMissingRef", () => {
    const knownPaths = new Set(["/foo", "/bar"])
    const result = validateSitemapDoc(minimalDoc(["/foo"]), knownPaths)
    expect(result.ok).toBe(false)
    if (result.ok) return
    const messages = result.errors.map((e) => e.message).join("\n")
    expect(messages).toContain("/bar")
    expect(messages).toContain("not referenced in sitemap.json")
  })
})

describe("validateSitemapDoc - duplicate detection", () => {
  test("validateSitemapDoc_duplicatePath_reportsConflict", () => {
    const doc = {
      sections: [
        {
          id: "a",
          heading: { ja: "A", en: "A" },
          items: [{ kind: "internal", path: "/foo" }],
        },
        {
          id: "b",
          heading: { ja: "B", en: "B" },
          items: [{ kind: "internal", path: "/foo" }],
        },
      ],
    }
    const result = validateSitemapDoc(doc, new Set(["/foo"]))
    expect(result.ok).toBe(false)
    if (result.ok) return
    const messages = result.errors.map((e) => e.message).join("\n")
    expect(messages).toContain("duplicate internal path")
    expect(messages).toContain("/foo")
  })

  test("validateSitemapDoc_duplicateSectionId_reportsConflict", () => {
    const doc = {
      sections: [
        {
          id: "dup",
          heading: { ja: "A", en: "A" },
          items: [{ kind: "internal", path: "/foo" }],
        },
        {
          id: "dup",
          heading: { ja: "B", en: "B" },
          items: [{ kind: "internal", path: "/bar" }],
        },
      ],
    }
    const result = validateSitemapDoc(doc, new Set(["/foo", "/bar"]))
    expect(result.ok).toBe(false)
    if (result.ok) return
    const messages = result.errors.map((e) => e.message).join("\n")
    expect(messages).toContain("duplicate section id")
    expect(messages).toContain("dup")
  })
})

describe("validateSitemapDoc - order preserved", () => {
  test("validateSitemapDoc_itemOrder_returnsAuthoredOrder", () => {
    const knownPaths = new Set(["/dra", "/bioproject"])
    const result = validateSitemapDoc(
      minimalDoc(["/dra", "/bioproject"]),
      knownPaths,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const items = result.doc.sections[0]?.items ?? []
    expect(items[0]).toMatchObject({ kind: "internal", path: "/dra" })
    expect(items[1]).toMatchObject({ kind: "internal", path: "/bioproject" })
  })
})

describe("validateSitemap (real JSON + real corpus)", () => {
  test("validateSitemap_realInput_returnsOk", () => {
    const result = validateSitemap()
    expect(result.ok).toBe(true)
  })

  test("validateSitemap_referencesAllPages", () => {
    const corpus = knownFromCorpus()
    const result = validateSitemap()
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const referenced = new Set<string>()
    for (const section of result.doc.sections) {
      for (const item of section.items) {
        if (item.kind === "internal") referenced.add(item.path)
      }
    }
    for (const path of corpus) {
      expect(referenced).toContain(path)
    }
  })
})

describe("getSitemap (rendered with merged labels)", () => {
  test("getSitemap_internalItem_labelFromFrontmatter", () => {
    const sections = getSitemap()
    const bioproject = sections
      .flatMap((s) => s.items)
      .find((i) => i.kind === "internal" && i.path === "/bioproject")
    expect(bioproject).toBeDefined()
    if (!bioproject || bioproject.kind !== "internal") return
    expect(bioproject.label.ja).toBe("BioProject")
    expect(bioproject.label.en).toBe("BioProject")
  })

  test("getSitemap_repositorySection_firstItemIsDdbj", () => {
    const sections = getSitemap()
    const repo = sections.find((s) => s.id === "repository")
    expect(repo).toBeDefined()
    if (!repo) return
    const first = repo.items[0]
    expect(first).toMatchObject({ kind: "internal", path: "/ddbj" })
  })

  test("getSitemap_policySection_includesTermOfUse", () => {
    const sections = getSitemap()
    const policy = sections.find((s) => s.id === "policy")
    expect(policy).toBeDefined()
    if (!policy) return
    const paths = policy.items.flatMap((i) => (i.kind === "internal" ? [i.path] : []))
    expect(paths).toContain("/policy")
    expect(paths).toContain("/policy/term-of-use")
  })

  test("getSitemap_sectionHeadings_areBilingual", () => {
    const sections = getSitemap()
    for (const section of sections) {
      expect(section.heading.ja.length).toBeGreaterThan(0)
      expect(section.heading.en.length).toBeGreaterThan(0)
    }
  })
})
