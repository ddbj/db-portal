import { describe, expect, test } from "vitest"

import { detectLangHint, resolveLang } from "~/lib/i18n/resolve-lang.server"

describe("detectLangHint", () => {
  test("detectLangHint_jaQuery_returnsJa", () => {
    expect(detectLangHint(new URLSearchParams("lang=ja"))).toBe("ja")
  })

  test("detectLangHint_enQuery_returnsEn", () => {
    expect(detectLangHint(new URLSearchParams("lang=en"))).toBe("en")
  })

  test("detectLangHint_noLangQuery_returnsNull", () => {
    expect(detectLangHint(new URLSearchParams("q=cancer"))).toBeNull()
  })

  test("detectLangHint_invalidValue_returnsNull", () => {
    expect(detectLangHint(new URLSearchParams("lang=fr"))).toBeNull()
  })

  test("detectLangHint_emptyValue_returnsNull", () => {
    expect(detectLangHint(new URLSearchParams("lang="))).toBeNull()
  })

  test("detectLangHint_amongOtherParams_returnsValue", () => {
    expect(detectLangHint(new URLSearchParams("q=cancer&lang=en&page=2"))).toBe("en")
  })
})

describe("resolveLang priority: cookie", () => {
  test("resolveLang_cookieJa_returnsJa", () => {
    expect(
      resolveLang({
        cookieLang: "ja",
        acceptLanguage: "en-US,en;q=0.9",
        defaultLang: "ja",
      }),
    ).toBe("ja")
  })

  test("resolveLang_cookieEn_returnsEn", () => {
    expect(
      resolveLang({
        cookieLang: "en",
        acceptLanguage: "ja-JP,ja;q=0.9",
        defaultLang: "ja",
      }),
    ).toBe("en")
  })
})

describe("resolveLang priority: Accept-Language fallback", () => {
  test("resolveLang_noCookieJaHeader_returnsJa", () => {
    expect(
      resolveLang({
        cookieLang: undefined,
        acceptLanguage: "ja-JP,ja;q=0.9,en;q=0.8",
        defaultLang: "en",
      }),
    ).toBe("ja")
  })

  test("resolveLang_noCookieEnHeader_returnsEn", () => {
    expect(
      resolveLang({
        cookieLang: undefined,
        acceptLanguage: "en-US,en;q=0.9",
        defaultLang: "ja",
      }),
    ).toBe("en")
  })

  test("resolveLang_noCookieFrenchHeader_fallsBackToDefault", () => {
    expect(
      resolveLang({
        cookieLang: undefined,
        acceptLanguage: "fr-FR,fr;q=0.9",
        defaultLang: "ja",
      }),
    ).toBe("ja")
  })

  test("resolveLang_noCookieNoHeader_fallsBackToDefault", () => {
    expect(
      resolveLang({
        cookieLang: undefined,
        acceptLanguage: null,
        defaultLang: "ja",
      }),
    ).toBe("ja")
  })

  test("resolveLang_noCookieEmptyHeader_fallsBackToDefault", () => {
    expect(
      resolveLang({
        cookieLang: undefined,
        acceptLanguage: "",
        defaultLang: "en",
      }),
    ).toBe("en")
  })

  test("resolveLang_noCookieMixedHeader_picksHighestQ", () => {
    expect(
      resolveLang({
        cookieLang: undefined,
        acceptLanguage: "en;q=0.5,ja;q=0.9",
        defaultLang: "en",
      }),
    ).toBe("ja")
  })

  test("resolveLang_noCookieHeaderWithExplicitQ1_returnsLang", () => {
    expect(
      resolveLang({
        cookieLang: undefined,
        acceptLanguage: "en;q=1,ja;q=0.7",
        defaultLang: "ja",
      }),
    ).toBe("en")
  })

  test("resolveLang_defaultLangAlwaysUsedOnUnsupported", () => {
    expect(
      resolveLang({
        cookieLang: undefined,
        acceptLanguage: "de-DE,zh-CN;q=0.5",
        defaultLang: "en",
      }),
    ).toBe("en")
  })
})
