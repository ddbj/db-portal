import { describe, expect, test } from "vitest"

import { serviceDescription, type ServiceItem } from "~/lib/api"

const itemWith = (description: { ja: string; en: string }): ServiceItem => ({
  id: "ddbj-x",
  source: "ddbj",
  name: { ja: "X", en: "X" },
  description,
  categories: ["other"],
  rawCategories: [],
  featuredTop: false,
})

describe("serviceDescription", () => {
  test("serviceDescription_jaWithoutPeriod_appendsMaru", () => {
    const item = itemWith({ ja: "ウェブフォームの塩基配列登録システム", en: "" })
    expect(serviceDescription(item, "ja")).toBe("ウェブフォームの塩基配列登録システム。")
  })

  test("serviceDescription_jaAlreadyEndsWithMaru_unchanged", () => {
    const ja = "原核生物ゲノムの高速自動アノテーションパイプライン。"
    expect(serviceDescription(itemWith({ ja, en: "" }), "ja")).toBe(ja)
  })

  test("serviceDescription_jaEndsWithFullwidthQuestion_unchanged", () => {
    const ja = "このサービスを使いますか？"
    expect(serviceDescription(itemWith({ ja, en: "" }), "ja")).toBe(ja)
  })

  test("serviceDescription_jaEndsWithClosingParen_appendsMaru", () => {
    const item = itemWith({ ja: "塩基配列を登録する（ベータ版）", en: "" })
    expect(serviceDescription(item, "ja")).toBe("塩基配列を登録する（ベータ版）。")
  })

  test("serviceDescription_jaEndsWithLatinWord_appendsMaru", () => {
    const item = itemWith({ ja: "DDBJ センターの linked data", en: "" })
    expect(serviceDescription(item, "ja")).toBe("DDBJ センターの linked data。")
  })

  test("serviceDescription_enWithoutPeriod_appendsDot", () => {
    const item = itemWith({ ja: "", en: "DDBJ annotated data retrieval by accession numbers" })
    expect(serviceDescription(item, "en")).toBe("DDBJ annotated data retrieval by accession numbers.")
  })

  test("serviceDescription_enAlreadyEndsWithDot_unchanged", () => {
    const en = "An automatic annotation service for prokaryotic genomes."
    expect(serviceDescription(itemWith({ ja: "", en }), "en")).toBe(en)
  })

  test("serviceDescription_bothEmpty_returnsUndefined", () => {
    expect(serviceDescription(itemWith({ ja: "", en: "" }), "ja")).toBeUndefined()
    expect(serviceDescription(itemWith({ ja: "", en: "" }), "en")).toBeUndefined()
  })

  test("serviceDescription_langEnButEnEmpty_fallsBackToJaWithMaru", () => {
    const item = itemWith({ ja: "塩基配列を検索", en: "" })
    expect(serviceDescription(item, "en")).toBe("塩基配列を検索。")
  })

  test("serviceDescription_langJaButJaEmpty_fallsBackToEnWithDot", () => {
    const item = itemWith({ ja: "", en: "Taxonomy database search" })
    expect(serviceDescription(item, "ja")).toBe("Taxonomy database search.")
  })

  test("serviceDescription_picksRequestedLangBeforeFallback", () => {
    const item = itemWith({ ja: "和文説明", en: "English description" })
    expect(serviceDescription(item, "ja")).toBe("和文説明。")
    expect(serviceDescription(item, "en")).toBe("English description.")
  })
})
