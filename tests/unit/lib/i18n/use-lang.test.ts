import { describe, expect, test } from "vitest"

import { determineLang } from "~/lib/i18n/use-lang"

describe("determineLang", () => {
  test("determineLang_emptyMatches_returnsJa", () => {
    expect(determineLang([])).toBe("ja")
  })

  test("determineLang_noLangHandle_returnsJa", () => {
    expect(determineLang([{ handle: { other: "x" } }, { handle: null }])).toBe("ja")
  })

  test("determineLang_anyEnHandle_returnsEn", () => {
    expect(determineLang([{ handle: { something: "y" } }, { handle: { lang: "en" } }])).toBe("en")
  })

  test("determineLang_jaHandle_returnsJa", () => {
    expect(determineLang([{ handle: { lang: "ja" } }])).toBe("ja")
  })

  test("determineLang_handleUndefined_returnsJa", () => {
    expect(determineLang([{ handle: undefined }])).toBe("ja")
  })
})
