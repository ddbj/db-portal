import { describe, expect, test } from "vitest"

import { extractSummary } from "../../../../server/news/normalize"

const SUMMARY_LIMIT = 180

describe("extractSummary length cap", () => {
  test("extractSummary_exactlyLimitChars_returnedWithoutEllipsis", () => {
    const body = "a".repeat(SUMMARY_LIMIT)
    const result = extractSummary(body)
    expect(result).toBe(body)
    expect(result).toHaveLength(SUMMARY_LIMIT)
    expect(result?.endsWith("…")).toBe(false)
  })

  test("extractSummary_oneOverLimit_truncatedToLimitPlusEllipsis", () => {
    const body = "a".repeat(SUMMARY_LIMIT + 1)
    const result = extractSummary(body)
    expect(result).toBe(`${"a".repeat(SUMMARY_LIMIT)}…`)
    expect(result).toHaveLength(SUMMARY_LIMIT + 1)
    expect(result?.slice(0, SUMMARY_LIMIT)).toBe("a".repeat(SUMMARY_LIMIT))
    expect(result?.endsWith("…")).toBe(true)
  })

  test("extractSummary_oneUnderLimit_returnedWholeWithoutEllipsis", () => {
    const body = "a".repeat(SUMMARY_LIMIT - 1)
    const result = extractSummary(body)
    expect(result).toBe(body)
    expect(result?.endsWith("…")).toBe(false)
  })

  test("extractSummary_farOverLimit_keepsOnlyFirstLimitChars", () => {
    const body = "a".repeat(500)
    const result = extractSummary(body)
    expect(result).toHaveLength(SUMMARY_LIMIT + 1)
    expect(result?.endsWith("…")).toBe(true)
    expect([...(result ?? "")].filter((c) => c === "a")).toHaveLength(SUMMARY_LIMIT)
  })
})

describe("extractSummary markdown stripping", () => {
  test("extractSummary_leadingHeadingHash_stripsHashPrefix", () => {
    expect(extractSummary("# Heading text")).toBe("Heading text")
    expect(extractSummary("### Deeper heading")).toBe("Deeper heading")
  })

  test("extractSummary_inlineLink_keepsTextDropsUrl", () => {
    expect(extractSummary("See [the docs](https://example.com/page) now")).toBe(
      "See the docs now",
    )
  })

  test("extractSummary_linkTextOnly_dropsUrlEvenWhenTextEmpty", () => {
    expect(extractSummary("prefix [](https://example.com) suffix")).toBe(
      "prefix suffix",
    )
  })

  test("extractSummary_image_removedEntirely", () => {
    expect(extractSummary("before ![alt](https://example.com/i.png) after")).toBe(
      "before after",
    )
  })
})

describe("extractSummary block selection", () => {
  test("extractSummary_blankLineSeparatedBlocks_keepsOnlyFirstBlock", () => {
    expect(extractSummary("first para\n\nsecond para")).toBe("first para")
  })

  test("extractSummary_blankLineWithWhitespace_stillSplitsAtFirstBlock", () => {
    expect(extractSummary("first para\n \t \nsecond para")).toBe("first para")
  })

  test("extractSummary_singleNewlineInsideBlock_collapsedToSpace", () => {
    expect(extractSummary("line one\nline two")).toBe("line one line two")
  })
})

describe("extractSummary empty results", () => {
  test("extractSummary_emptyString_returnsUndefined", () => {
    expect(extractSummary("")).toBeUndefined()
  })

  test("extractSummary_whitespaceOnly_returnsUndefined", () => {
    expect(extractSummary("   \n\t  \n  ")).toBeUndefined()
  })

  test("extractSummary_markdownThatReducesToEmpty_returnsUndefined", () => {
    expect(extractSummary("![alt](https://example.com/i.png)")).toBeUndefined()
  })

  test("extractSummary_leadingWhitespaceThenText_stripsLeadingWhitespace", () => {
    expect(extractSummary("\n\n  Actual content")).toBe("Actual content")
  })
})
