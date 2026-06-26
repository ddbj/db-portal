import { fc, test } from "@fast-check/vitest"
import { describe, expect } from "vitest"

import { en, flattenKeys, ja } from "~/lib/i18n"

const jaKeys = flattenKeys(ja).sort()
const enKeys = flattenKeys(en).sort()

const lookupValue = (resource: unknown, dotKey: string): unknown => {
  let current: unknown = resource
  for (const part of dotKey.split(".")) {
    if (current === null || typeof current !== "object") return undefined
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

describe("i18n resource parity", () => {
  test("i18n_jaEnKeySets_areEqual", () => {
    expect(enKeys).toEqual(jaKeys)
  })

  test("i18n_keyCount_isNonZero", () => {
    expect(jaKeys.length).toBeGreaterThan(0)
  })

  const expectNonEmptyLeaf = (value: unknown): void => {
    if (Array.isArray(value)) {
      expect(value.length).toBeGreaterThan(0)
      for (const item of value) {
        expect(typeof item).toBe("string")
        expect(item).not.toBe("")
      }
    } else {
      expect(typeof value).toBe("string")
      expect(value).not.toBe("")
    }
  }

  // 意図的に空文字列を入れるキー (UI 側で `sub !== ""` 等で出力を抑制する設計)。
  // 翻訳漏れ検知の対象から除外する。
  const intentionalEmpty = new Set<string>([
    "submit.flow.accessOverview.emptySub",
  ])

  const nonEmptyJaKeys = jaKeys.filter((k) => !intentionalEmpty.has(k))
  const nonEmptyEnKeys = enKeys.filter((k) => !intentionalEmpty.has(k))

  test.prop([fc.constantFrom(...nonEmptyJaKeys)], { numRuns: 100 })(
    "i18n_anyJaKey_resolvesToNonEmptyString",
    (key) => {
      expectNonEmptyLeaf(lookupValue(ja, key))
    },
  )

  test.prop([fc.constantFrom(...nonEmptyEnKeys)], { numRuns: 100 })(
    "i18n_anyEnKey_resolvesToNonEmptyString",
    (key) => {
      expectNonEmptyLeaf(lookupValue(en, key))
    },
  )

  // ja value にひらがな・カタカナ・漢字が含まれているのに en value と完全一致 = 翻訳忘れ。
  // 記号・固有名詞・URL・コード片など日本語文字を含まないキーは翻訳不要とみなして exempt する。
  const containsJapanese = (value: string): boolean => /[ぁ-んァ-ヶ一-龯]/.test(value)

  // 意図的に ja / en で同一文字列を用いるキー。
  // - common.siteName: ja/en で同一のブランド表記
  // - switchLang.toJa / toEn: language switcher は対象言語そのものを表示する仕様
  const intentionalDuplicates = new Set<string>([
    "common.siteName",
    "switchLang.toJa",
    "switchLang.toEn",
  ])

  const jaJapaneseLeaves = jaKeys.filter((key) => {
    if (intentionalDuplicates.has(key)) return false
    const jaValue = lookupValue(ja, key)
    return typeof jaValue === "string" && containsJapanese(jaValue)
  })

  test("i18n_translatableLeaves_existInResource", () => {
    expect(jaJapaneseLeaves.length).toBeGreaterThan(0)
  })

  test.prop([fc.constantFrom(...jaJapaneseLeaves)], { numRuns: 200 })(
    "i18n_anyTranslatableKey_jaAndEnLiteralsDiffer",
    (key) => {
      const jaValue = lookupValue(ja, key)
      const enValue = lookupValue(en, key)
      expect(jaValue).not.toBe(enValue)
    },
  )
})
