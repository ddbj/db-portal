import { fc, test } from "@fast-check/vitest"
import { expect } from "vitest"

import { serviceDescription, type ServiceItem } from "~/lib/api"

const TERMINATED = /[。．.！？!?…]$/
const terminators = ["。", "．", ".", "！", "？", "!", "?", "…"]

const arbText: fc.Arbitrary<string> = fc
  .tuple(
    fc.oneof(
      fc.string({ minLength: 1 }),
      fc.constantFrom("塩基配列を検索", "ゲノムを登録する", "データベース", "linked data"),
    ),
    fc.option(fc.constantFrom(...terminators), { nil: "" }),
  )
  .map(([body, tail]) => body + tail)

const itemWith = (description: { ja: string; en: string }): ServiceItem => ({
  id: "x",
  source: "ddbj",
  name: { ja: "X", en: "X" },
  description,
  categories: ["other"],
  rawCategories: [],
  featuredTop: false,
})

test.prop({ text: arbText })(
  "serviceDescription_jaNonEmpty_isTerminatedAndPreservesPrefix",
  ({ text }) => {
    const r = serviceDescription(itemWith({ ja: text, en: "" }), "ja")
    expect(r).toBeDefined()
    expect(r!.startsWith(text)).toBe(true)
    expect(TERMINATED.test(r!)).toBe(true)
    expect([0, 1]).toContain(r!.length - text.length)
    if (r !== text) expect(r!.endsWith("。")).toBe(true)
  },
)

test.prop({ text: arbText })(
  "serviceDescription_ja_isIdempotent",
  ({ text }) => {
    const once = serviceDescription(itemWith({ ja: text, en: "" }), "ja")!
    const twice = serviceDescription(itemWith({ ja: once, en: "" }), "ja")
    expect(twice).toBe(once)
  },
)

test.prop({ text: arbText })(
  "serviceDescription_enNonEmpty_isTerminatedWithDotWhenChanged",
  ({ text }) => {
    const r = serviceDescription(itemWith({ ja: "", en: text }), "en")
    expect(r).toBeDefined()
    expect(r!.startsWith(text)).toBe(true)
    expect(TERMINATED.test(r!)).toBe(true)
    expect([0, 1]).toContain(r!.length - text.length)
    if (r !== text) expect(r!.endsWith(".")).toBe(true)
  },
)

test.prop({ text: arbText })(
  "serviceDescription_jaMissing_fallsBackToEnWithEnglishRule",
  ({ text }) => {
    const item = itemWith({ ja: "", en: text })
    expect(serviceDescription(item, "ja")).toBe(serviceDescription(item, "en"))
  },
)
