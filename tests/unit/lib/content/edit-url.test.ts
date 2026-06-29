import { describe, expect, test } from "vitest"

import { buildEditUrl, DEFAULT_BRANCH, REPO_URL } from "~/lib/content/edit-url"

describe("buildEditUrl", () => {
  test("buildEditUrl_ja_returnsJaPath", () => {
    const url = buildEditUrl(
      { ja: "page-contents/bioproject/index.md", en: "page-contents/bioproject/index.en.md" },
      "ja",
    )
    expect(url).toBe(`${REPO_URL}/edit/${DEFAULT_BRANCH}/page-contents/bioproject/index.md`)
  })

  test("buildEditUrl_en_returnsEnPath", () => {
    const url = buildEditUrl(
      { ja: "page-contents/bioproject/index.md", en: "page-contents/bioproject/index.en.md" },
      "en",
    )
    expect(url).toBe(`${REPO_URL}/edit/${DEFAULT_BRANCH}/page-contents/bioproject/index.en.md`)
  })

  test("buildEditUrl_en_fallsBackToJaWhenEnMissing", () => {
    const url = buildEditUrl({ ja: "page-contents/policy/index.md" }, "en")
    expect(url).toBe(`${REPO_URL}/edit/${DEFAULT_BRANCH}/page-contents/policy/index.md`)
  })

  test("buildEditUrl_nonIndexFile_preservesFileName", () => {
    const url = buildEditUrl(
      {
        ja: "page-contents/policy/term-of-use.md",
        en: "page-contents/policy/term-of-use.en.md",
      },
      "ja",
    )
    expect(url).toBe(
      `${REPO_URL}/edit/${DEFAULT_BRANCH}/page-contents/policy/term-of-use.md`,
    )
  })

  test("buildEditUrl_doesNotProduceDoubleSlash", () => {
    const url = buildEditUrl({ ja: "page-contents/bioproject/index.md" }, "ja")
    expect(url).not.toMatch(/[^:]\/\//)
  })
})
