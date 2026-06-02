import { describe, expect, test } from "vitest"

import { type ServiceItem, serviceName, serviceUrl } from "~/lib/api"

type NamePair = { ja: string; en: string }
type UrlPair = { ja?: string; en?: string }

const itemWithName = (name: NamePair): ServiceItem => ({
  id: "ddbj-x",
  source: "ddbj",
  name,
  description: { ja: "", en: "" },
  categories: ["other"],
  rawCategories: [],
  featuredTop: false,
})

const itemWithUrl = (url: UrlPair | undefined): ServiceItem => ({
  id: "ddbj-x",
  source: "ddbj",
  name: { ja: "X", en: "X" },
  description: { ja: "", en: "" },
  url,
  categories: ["other"],
  rawCategories: [],
  featuredTop: false,
})

describe("serviceName", () => {
  test("serviceName_picksRequestedLangBeforeFallback", () => {
    const item = itemWithName({ ja: "和名", en: "English name" })
    expect(serviceName(item, "ja")).toBe("和名")
    expect(serviceName(item, "en")).toBe("English name")
  })

  test("serviceName_langEnButEnEmpty_fallsBackToJa", () => {
    const item = itemWithName({ ja: "和名", en: "" })
    expect(serviceName(item, "en")).toBe("和名")
  })

  test("serviceName_langJaButJaEmpty_fallsBackToEn", () => {
    const item = itemWithName({ ja: "", en: "English name" })
    expect(serviceName(item, "ja")).toBe("English name")
  })

  test("serviceName_jaEmptyAndRequestedJa_fallsBackThroughJaToEn", () => {
    const item = itemWithName({ ja: "", en: "English name" })
    expect(serviceName(item, "ja")).toBe("English name")
  })

  test("serviceName_bothEmpty_returnsEmptyString", () => {
    const item = itemWithName({ ja: "", en: "" })
    expect(serviceName(item, "ja")).toBe("")
    expect(serviceName(item, "en")).toBe("")
  })
})

describe("serviceUrl", () => {
  test("serviceUrl_picksRequestedLangBeforeFallback", () => {
    const item = itemWithUrl({
      ja: "https://example.com/ja",
      en: "https://example.com/en",
    })
    expect(serviceUrl(item, "ja")).toBe("https://example.com/ja")
    expect(serviceUrl(item, "en")).toBe("https://example.com/en")
  })

  test("serviceUrl_urlObjectAbsent_returnsUndefined", () => {
    const item = itemWithUrl(undefined)
    expect(serviceUrl(item, "ja")).toBeUndefined()
    expect(serviceUrl(item, "en")).toBeUndefined()
  })

  test("serviceUrl_langEnButEnUndefined_fallsBackToJa", () => {
    const item = itemWithUrl({ ja: "https://example.com/ja" })
    expect(serviceUrl(item, "en")).toBe("https://example.com/ja")
  })

  test("serviceUrl_langJaButJaUndefined_fallsBackToEn", () => {
    const item = itemWithUrl({ en: "https://example.com/en" })
    expect(serviceUrl(item, "ja")).toBe("https://example.com/en")
  })

  test("serviceUrl_jaOnlyAndRequestedEn_returnsJa", () => {
    const item = itemWithUrl({ ja: "https://example.com/ja" })
    expect(serviceUrl(item, "en")).toBe("https://example.com/ja")
  })

  test("serviceUrl_allUndefined_returnsUndefined", () => {
    const item = itemWithUrl({})
    expect(serviceUrl(item, "ja")).toBeUndefined()
    expect(serviceUrl(item, "en")).toBeUndefined()
  })
})

describe("serviceName vs serviceUrl fallback asymmetry", () => {
  test("serviceName_requestedLangEmptyString_fallsThrough", () => {
    const item = itemWithName({ ja: "", en: "English name" })
    expect(serviceName(item, "ja")).toBe("English name")
  })

  test("serviceUrl_requestedLangEmptyString_doesNotFallThrough", () => {
    const item = itemWithUrl({ ja: "", en: "https://example.com/en" })
    expect(serviceUrl(item, "ja")).toBe("")
  })

  test("serviceUrl_requestedLangEmptyStringAndOthersAbsent_returnsEmptyString", () => {
    const item = itemWithUrl({ ja: "" })
    expect(serviceUrl(item, "ja")).toBe("")
    expect(serviceUrl(item, "en")).toBe("")
  })
})
