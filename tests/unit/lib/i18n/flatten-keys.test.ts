import { describe, expect, test } from "vitest"

import { flattenKeys } from "~/lib/i18n/flatten-keys"

describe("flattenKeys", () => {
  test("flattenKeys_emptyObject_returnsEmptyArray", () => {
    expect(flattenKeys({})).toEqual([])
  })

  test("flattenKeys_flatObject_returnsTopKeys", () => {
    expect(flattenKeys({ a: "1", b: "2" })).toEqual(["a", "b"])
  })

  test("flattenKeys_nested_joinsWithDot", () => {
    expect(flattenKeys({ a: { b: "1", c: { d: "2" } }, e: "3" })).toEqual(["a.b", "a.c.d", "e"])
  })

  test("flattenKeys_arrayValue_treatedAsLeaf", () => {
    expect(flattenKeys({ a: [1, 2, 3] })).toEqual(["a"])
  })

  test("flattenKeys_nonObjectInput_returnsEmpty", () => {
    expect(flattenKeys("scalar")).toEqual([])
    expect(flattenKeys(null)).toEqual([])
    expect(flattenKeys(42)).toEqual([])
  })
})
