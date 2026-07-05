import { describe, expect, test } from "vitest"

import { buildEntries } from "~/lib/content/markdown-loader"

// 最低限の valid frontmatter (PageFrontmatter Zod を通す形)。
const md = (title: string) =>
  [
    "---",
    `title: ${title}`,
    `description: ${title} description`,
    "---",
    "",
    "body",
  ].join("\n")

describe("buildEntries — orphan EN handling", () => {
  test("buildEntries_enFileWithNoMatchingJaModule_collectedAsOrphan", () => {
    // ja module 不在 → orphan EN として収集される。 silent drop していたら
    // result.orphanEnFilepaths は空になる。
    const ja = {}
    const en = {
      "/page-contents/test-orphan-fixture/index.en.md": md("orphan"),
    }

    const result = buildEntries(ja, en)

    expect(result.orphanEnFilepaths).toContain("/page-contents/test-orphan-fixture/index.en.md")
    expect(result.entries.find((e) => e.urlPath === "/test-orphan-fixture")).toBeUndefined()
  })

  test("buildEntries_pairedJaAndEn_doesNotCollectOrphan", () => {
    const ja = {
      "/page-contents/paired/index.md": md("paired"),
    }
    const en = {
      "/page-contents/paired/index.en.md": md("paired"),
    }

    const result = buildEntries(ja, en)

    expect(result.orphanEnFilepaths).toHaveLength(0)
    const entry = result.entries.find((e) => e.urlPath === "/paired")
    expect(entry).toBeDefined()
    expect(entry?.enFilepath).toBe("/page-contents/paired/index.en.md")
  })

  test("buildEntries_jaOnlyNoEn_doesNotCollectOrphan", () => {
    // EN を後で追加する pattern は通常運用なので orphan 扱いしない。
    const ja = {
      "/page-contents/ja-only/index.md": md("ja-only"),
    }
    const en = {}

    const result = buildEntries(ja, en)

    expect(result.orphanEnFilepaths).toHaveLength(0)
    expect(result.entries.find((e) => e.urlPath === "/ja-only")).toBeDefined()
  })
})
