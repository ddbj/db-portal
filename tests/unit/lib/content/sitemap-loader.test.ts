import { describe, expect, test } from "vitest"

import {
  getSitemap,
  renderSitemap,
  validateSitemap,
  validateSitemapDoc,
} from "~/lib/content"

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
    const result = validateSitemapDoc(minimalDoc(["/foo", "/bar"]))
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
    const result = validateSitemapDoc(doc)
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
    const result = validateSitemapDoc(doc)
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
    const result = validateSitemapDoc(doc)
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
    const result = validateSitemapDoc(doc)
    expect(result.ok).toBe(false)
  })

  test("validateSitemapDoc_internalWithLabelJaOnly_returnsOk", () => {
    const doc = {
      sections: [
        {
          id: "primary",
          heading: { ja: "あ", en: "A" },
          items: [
            { kind: "internal", path: "/x", label: { ja: "手書き" } },
          ],
        },
      ],
    }
    const result = validateSitemapDoc(doc)
    expect(result.ok).toBe(true)
  })

  test("validateSitemapDoc_internalWithLabelJaAndEn_returnsOk", () => {
    const doc = {
      sections: [
        {
          id: "primary",
          heading: { ja: "あ", en: "A" },
          items: [
            {
              kind: "internal",
              path: "/x",
              label: { ja: "手書き", en: "Manual" },
            },
          ],
        },
      ],
    }
    const result = validateSitemapDoc(doc)
    expect(result.ok).toBe(true)
  })

  test("validateSitemapDoc_internalLabelMissingJa_fails", () => {
    const doc = {
      sections: [
        {
          id: "primary",
          heading: { ja: "あ", en: "A" },
          items: [
            { kind: "internal", path: "/x", label: { en: "Manual" } },
          ],
        },
      ],
    }
    const result = validateSitemapDoc(doc)
    expect(result.ok).toBe(false)
  })
})

describe("validateSitemapDoc - no page-corpus coupling", () => {
  test("validateSitemapDoc_pathNotInCorpus_returnsOk", () => {
    const result = validateSitemapDoc(minimalDoc(["/does-not-exist"]))
    expect(result.ok).toBe(true)
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
    const result = validateSitemapDoc(doc)
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
    const result = validateSitemapDoc(doc)
    expect(result.ok).toBe(false)
    if (result.ok) return
    const messages = result.errors.map((e) => e.message).join("\n")
    expect(messages).toContain("duplicate section id")
    expect(messages).toContain("dup")
  })
})

describe("validateSitemapDoc - order preserved", () => {
  test("validateSitemapDoc_itemOrder_returnsAuthoredOrder", () => {
    const result = validateSitemapDoc(minimalDoc(["/dra", "/bioproject"]))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const items = result.doc.sections[0]?.items ?? []
    expect(items[0]).toMatchObject({ kind: "internal", path: "/dra" })
    expect(items[1]).toMatchObject({ kind: "internal", path: "/bioproject" })
  })
})

describe("validateSitemap (real JSON)", () => {
  test("validateSitemap_realInput_returnsOk", () => {
    const result = validateSitemap()
    expect(result.ok).toBe(true)
  })
})

describe("renderSitemap - internal item label resolution", () => {
  const withInternal = (item: {
    path: string
    label?: { ja: string; en?: string }
  }) => {
    const parsed = validateSitemapDoc({
      sections: [
        {
          id: "primary",
          heading: { ja: "あ", en: "A" },
          items: [{ kind: "internal", ...item }],
        },
      ],
    })
    if (!parsed.ok) throw new Error("fixture failed to parse")

    return renderSitemap(parsed.doc)
  }

  test("renderSitemap_internalWithoutLabel_usesFrontmatterTitle", () => {
    const sections = withInternal({ path: "/bioproject" })
    const item = sections[0]?.items[0]
    expect(item).toMatchObject({
      kind: "internal",
      path: "/bioproject",
      label: { ja: "BioProject", en: "BioProject" },
    })
  })

  test("renderSitemap_internalWithLabel_overridesFrontmatter", () => {
    const sections = withInternal({
      path: "/bioproject",
      label: { ja: "上書きラベル", en: "Overridden" },
    })
    const item = sections[0]?.items[0]
    expect(item).toMatchObject({
      kind: "internal",
      path: "/bioproject",
      label: { ja: "上書きラベル", en: "Overridden" },
    })
  })

  test("renderSitemap_internalWithLabelNoMatchingPage_rendersLabel", () => {
    const sections = withInternal({
      path: "/does-not-exist",
      label: { ja: "手書き", en: "Manual" },
    })
    const item = sections[0]?.items[0]
    expect(item).toMatchObject({
      kind: "internal",
      path: "/does-not-exist",
      label: { ja: "手書き", en: "Manual" },
    })
  })

  test("renderSitemap_internalWithLabelJaOnly_omitsEn", () => {
    const sections = withInternal({
      path: "/does-not-exist",
      label: { ja: "手書きのみ" },
    })
    const item = sections[0]?.items[0]
    expect(item).toEqual({
      kind: "internal",
      path: "/does-not-exist",
      label: { ja: "手書きのみ" },
    })
  })

  test("renderSitemap_internalNoLabelNoMatchingPage_throws", () => {
    expect(() => withInternal({ path: "/does-not-exist" })).toThrow(
      /has no label and no matching page/,
    )
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
