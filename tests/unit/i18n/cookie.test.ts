import { describe, expect, it } from "vitest"

import {
  parseLangCookie,
  pickLang,
  pickLangFromAcceptLanguage,
} from "@/i18n/cookie"

describe("parseLangCookie", () => {

  it("returns 'ja' for 'lang=ja'", () => {
    expect(parseLangCookie("lang=ja")).toBe("ja")
  })

  it("returns 'en' for 'lang=en'", () => {
    expect(parseLangCookie("lang=en")).toBe("en")
  })

  it("returns null for null header", () => {
    expect(parseLangCookie(null)).toBeNull()
  })

  it("returns null for empty header", () => {
    expect(parseLangCookie("")).toBeNull()
  })

  it("returns null for unsupported value (fr)", () => {
    expect(parseLangCookie("lang=fr")).toBeNull()
  })

  it("returns null when 'lang' is missing among other cookies", () => {
    expect(parseLangCookie("foo=bar; baz=qux")).toBeNull()
  })

  it("finds 'lang' among other cookies", () => {
    expect(parseLangCookie("foo=bar; lang=ja; baz=qux")).toBe("ja")
  })

  it("trims whitespace around name and value", () => {
    expect(parseLangCookie("  lang  =  ja  ")).toBe("ja")
  })
})

describe("pickLangFromAcceptLanguage", () => {

  it("picks 'ja' from exact 'ja'", () => {
    expect(pickLangFromAcceptLanguage("ja")).toBe("ja")
  })

  it("picks 'ja' from 'ja-JP'", () => {
    expect(pickLangFromAcceptLanguage("ja-JP")).toBe("ja")
  })

  it("picks 'ja' from 'ja,en;q=0.9' (priority is order, not q-weight)", () => {
    expect(pickLangFromAcceptLanguage("ja,en;q=0.9")).toBe("ja")
  })

  it("picks 'en' from 'en-US,en;q=0.9'", () => {
    expect(pickLangFromAcceptLanguage("en-US,en;q=0.9")).toBe("en")
  })

  it("returns 'en' for null input", () => {
    expect(pickLangFromAcceptLanguage(null)).toBe("en")
  })

  it("returns 'en' for unsupported language (fr)", () => {
    expect(pickLangFromAcceptLanguage("fr")).toBe("en")
  })
})

describe("pickLang", () => {

  it("uses cookie when present and valid", () => {
    expect(pickLang("lang=ja", "en-US")).toBe("ja")
  })

  it("falls back to Accept-Language when cookie missing", () => {
    expect(pickLang(null, "ja-JP,en;q=0.9")).toBe("ja")
  })

  it("falls back to 'en' when both missing", () => {
    expect(pickLang(null, null)).toBe("en")
  })

  it("falls back to Accept-Language when cookie value is unsupported", () => {
    expect(pickLang("lang=fr", "ja")).toBe("ja")
  })
})
