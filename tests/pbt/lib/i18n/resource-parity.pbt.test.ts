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

  test.prop([fc.constantFrom(...jaKeys)], { numRuns: 100 })(
    "i18n_anyJaKey_resolvesToNonEmptyString",
    (key) => {
      expectNonEmptyLeaf(lookupValue(ja, key))
    },
  )

  test.prop([fc.constantFrom(...enKeys)], { numRuns: 100 })(
    "i18n_anyEnKey_resolvesToNonEmptyString",
    (key) => {
      expectNonEmptyLeaf(lookupValue(en, key))
    },
  )
})
