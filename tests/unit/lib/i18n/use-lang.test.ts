import { describe, expect, test } from "vitest"

import { determineLang } from "~/lib/i18n/use-lang"

describe("determineLang", () => {
  test("determineLang_emptyMatches_returnsJa", () => {
    expect(determineLang([])).toBe("ja")
  })

  test("determineLang_noLangMatch_returnsJa", () => {
    expect(determineLang([{ data: { other: "x" } }, { data: null }])).toBe("ja")
  })

  test("determineLang_anyEnMatch_returnsEn", () => {
    expect(determineLang([{ data: { something: "y" } }, { data: { lang: "en" } }])).toBe("en")
  })

  test("determineLang_jaMatch_returnsJa", () => {
    expect(determineLang([{ data: { lang: "ja" } }])).toBe("ja")
  })

  test("determineLang_dataUndefined_returnsJa", () => {
    expect(determineLang([{ data: undefined }])).toBe("ja")
  })
})
