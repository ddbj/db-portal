import { fc, test } from "@fast-check/vitest"
import { describe, expect } from "vitest"

import { encodeQuery } from "~/lib/api/client"

const safeKey = fc.string({ minLength: 1, maxLength: 8 }).filter((s) =>
  /^[a-zA-Z][a-zA-Z0-9_]*$/.test(s),
)

const primitiveValue = fc.oneof(
  fc.string({ minLength: 0, maxLength: 16 }),
  fc.integer(),
  fc.boolean(),
)

const queryRecord = fc.dictionary(
  safeKey,
  fc.oneof(primitiveValue, fc.constant(undefined), fc.constant(null)),
  { minKeys: 0, maxKeys: 6 },
)

describe("encodeQuery PBT", () => {
  test.prop([queryRecord], { numRuns: 200 })(
    "encodeQuery_anyInput_isParseableAsURLSearchParams",
    (input) => {
      const encoded = encodeQuery(input)
      if (encoded === "") return
      expect(encoded.startsWith("?")).toBe(true)
      const params = new URLSearchParams(encoded.slice(1))
      for (const [key, value] of Object.entries(input)) {
        if (value === undefined || value === null) {
          expect(params.has(key)).toBe(false)
        } else {
          expect(params.get(key)).toBe(String(value))
        }
      }
    },
  )

  test.prop([queryRecord], { numRuns: 200 })(
    "encodeQuery_undefinedAndNullValues_areOmitted",
    (input) => {
      const encoded = encodeQuery(input)
      const params = new URLSearchParams(encoded.startsWith("?") ? encoded.slice(1) : encoded)
      for (const [key, value] of Object.entries(input)) {
        if (value === undefined || value === null) {
          expect(params.has(key)).toBe(false)
        }
      }
    },
  )

  test.prop([
    fc.dictionary(safeKey, fc.array(primitiveValue, { minLength: 1, maxLength: 4 }), { minKeys: 1, maxKeys: 4 }),
  ], { numRuns: 100 })(
    "encodeQuery_arrayValue_emitsRepeatedKeysInOrder",
    (input) => {
      const encoded = encodeQuery(input)
      const params = new URLSearchParams(encoded.startsWith("?") ? encoded.slice(1) : encoded)
      for (const [key, value] of Object.entries(input)) {
        expect(params.getAll(key)).toEqual(value.map(String))
      }
    },
  )
})
