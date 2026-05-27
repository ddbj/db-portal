import { fc, test } from "@fast-check/vitest"
import { describe, expect } from "vitest"

import { detectLangHint, resolveLang } from "~/lib/i18n/resolve-lang.server"

const langArb = fc.constantFrom("ja" as const, "en" as const)
const cookieLangArb = fc.option(langArb, { nil: undefined })
const acceptLanguageArb = fc.option(fc.string(), { nil: null })

describe("resolveLang PBT", () => {
  test.prop(
    [cookieLangArb, acceptLanguageArb, langArb],
    { numRuns: 500 },
  )(
    "resolveLang_anyInput_returnsJaOrEn",
    (cookieLang, acceptLanguage, defaultLang) => {
      const lang = resolveLang({ cookieLang, acceptLanguage, defaultLang })
      expect(lang === "ja" || lang === "en").toBe(true)
    },
  )

  test.prop(
    [langArb, acceptLanguageArb, langArb],
    { numRuns: 200 },
  )(
    "resolveLang_cookieLang_alwaysWinsOverHeaderAndDefault",
    (cookieLang, acceptLanguage, defaultLang) => {
      expect(resolveLang({ cookieLang, acceptLanguage, defaultLang })).toBe(cookieLang)
    },
  )

  test.prop([langArb], { numRuns: 100 })(
    "resolveLang_noCookieNoHeader_returnsDefaultLang",
    (defaultLang) => {
      expect(
        resolveLang({ cookieLang: undefined, acceptLanguage: null, defaultLang }),
      ).toBe(defaultLang)
    },
  )
})

describe("detectLangHint PBT", () => {
  test.prop([langArb], { numRuns: 100 })(
    "detectLangHint_langQuery_returnsThatLang",
    (lang) => {
      expect(detectLangHint(new URLSearchParams(`lang=${lang}`))).toBe(lang)
    },
  )

  test.prop(
    [fc.string().filter((s) => s !== "ja" && s !== "en" && !s.includes("&") && !s.includes("="))],
    { numRuns: 200 },
  )(
    "detectLangHint_unsupportedValue_returnsNull",
    (value) => {
      const params = new URLSearchParams()
      params.set("lang", value)
      expect(detectLangHint(params)).toBeNull()
    },
  )
})
