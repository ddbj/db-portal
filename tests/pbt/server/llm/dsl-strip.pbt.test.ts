import fc from "fast-check"
import { describe, expect, test } from "vitest"

import { stripUnsupported } from "../../../../server/llm/assistant/dsl"

describe("stripUnsupported (PBT)", () => {
  test("never leaves a fuzzy ~ or boost ^ character", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const out = stripUnsupported(s)
        expect(out.includes("~")).toBe(false)
        expect(out.includes("^")).toBe(false)
      }),
    )
  })

  test("a query with no ~ / ^ is unchanged (modulo trim)", () => {
    const safe = fc.string().filter((s) => !s.includes("~") && !s.includes("^"))
    fc.assert(
      fc.property(safe, (s) => {
        expect(stripUnsupported(s)).toBe(s.trim())
      }),
    )
  })
})
