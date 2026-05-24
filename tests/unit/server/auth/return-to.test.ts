import { describe, expect, test } from "vitest"

import { normalizeReturnTo } from "../../../../server/auth/return-to"

describe("normalizeReturnTo", () => {
  test.each([
    ["/databases/bioproject", "/databases/bioproject"],
    ["/en/search", "/en/search"],
    [undefined, "/"],
    [null, "/"],
    ["", "/"],
    ["//evil.test/path", "/"],
    ["/\\evil", "/"],
    ["https://evil.test", "/"],
    ["relative/path", "/"],
  ])("normalizeReturnTo(%j) → %s", (input, expected) => {
    expect(normalizeReturnTo(input)).toBe(expected)
  })
})
