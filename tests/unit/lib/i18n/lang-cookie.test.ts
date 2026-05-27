import { describe, expect, test } from "vitest"

import { LANG_COOKIE_NAME, parseLangCookie, serializeLangCookie } from "~/lib/i18n/lang-cookie.server"

describe("serializeLangCookie", () => {
  test("serializeLangCookie_setsName", () => {
    const header = serializeLangCookie("ja", { secure: false })
    expect(header.startsWith(`${LANG_COOKIE_NAME}=ja`)).toBe(true)
  })

  test("serializeLangCookie_setsLaxSameSite", () => {
    expect(serializeLangCookie("ja", { secure: false }).toLowerCase()).toContain("samesite=lax")
  })

  test("serializeLangCookie_setsPathRoot", () => {
    expect(serializeLangCookie("ja", { secure: false }).toLowerCase()).toContain("path=/")
  })

  test("serializeLangCookie_setsMaxAgeOneYear", () => {
    const oneYearSec = 60 * 60 * 24 * 365
    expect(serializeLangCookie("ja", { secure: false }).toLowerCase()).toContain(
      `max-age=${oneYearSec}`,
    )
  })

  test("serializeLangCookie_omitsHttpOnly", () => {
    expect(serializeLangCookie("ja", { secure: false }).toLowerCase()).not.toContain("httponly")
  })

  test("serializeLangCookie_secureTrue_appendsSecure", () => {
    expect(serializeLangCookie("en", { secure: true }).toLowerCase()).toContain("secure")
  })

  test("serializeLangCookie_secureFalse_omitsSecure", () => {
    expect(serializeLangCookie("en", { secure: false }).toLowerCase()).not.toContain("secure")
  })

  test("serializeLangCookie_en_writesEn", () => {
    expect(serializeLangCookie("en", { secure: false }).startsWith(`${LANG_COOKIE_NAME}=en`)).toBe(true)
  })
})

describe("parseLangCookie", () => {
  test("parseLangCookie_validJa_returnsJa", () => {
    expect(parseLangCookie(`${LANG_COOKIE_NAME}=ja`)).toBe("ja")
  })

  test("parseLangCookie_validEn_returnsEn", () => {
    expect(parseLangCookie(`${LANG_COOKIE_NAME}=en`)).toBe("en")
  })

  test("parseLangCookie_amongOtherCookies_returnsValue", () => {
    expect(parseLangCookie(`sid=abc; ${LANG_COOKIE_NAME}=en; other=x`)).toBe("en")
  })

  test("parseLangCookie_missing_returnsUndefined", () => {
    expect(parseLangCookie("sid=abc")).toBeUndefined()
  })

  test("parseLangCookie_emptyHeader_returnsUndefined", () => {
    expect(parseLangCookie("")).toBeUndefined()
  })

  test("parseLangCookie_nullHeader_returnsUndefined", () => {
    expect(parseLangCookie(null)).toBeUndefined()
  })

  test("parseLangCookie_invalidValue_returnsUndefined", () => {
    expect(parseLangCookie(`${LANG_COOKIE_NAME}=fr`)).toBeUndefined()
  })

  test("parseLangCookie_emptyValue_returnsUndefined", () => {
    expect(parseLangCookie(`${LANG_COOKIE_NAME}=`)).toBeUndefined()
  })
})

describe("serializeLangCookie + parseLangCookie roundtrip", () => {
  test("roundtrip_ja_returnsJa", () => {
    const header = serializeLangCookie("ja", { secure: false })
    const cookiePart = header.split(";")[0]
    expect(parseLangCookie(cookiePart)).toBe("ja")
  })

  test("roundtrip_en_returnsEn", () => {
    const header = serializeLangCookie("en", { secure: true })
    const cookiePart = header.split(";")[0]
    expect(parseLangCookie(cookiePart)).toBe("en")
  })
})
