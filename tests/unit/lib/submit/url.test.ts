import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import { TREE_NODES } from "@/lib/mock-data"
import { ALL_NODE_IDS, isValidNodeId, parseForParam } from "@/lib/submit/url"

const ALL_IDS = TREE_NODES.map((n) => n.id)

describe("parseForParam", () => {
  it("returns null when `for` is absent", () => {
    const sp = new URLSearchParams("")
    expect(parseForParam(sp)).toBeNull()
  })

  it("returns null for an invalid node id", () => {
    const sp = new URLSearchParams("for=invalid-xyz")
    expect(parseForParam(sp)).toBeNull()
  })

  it("returns the id for a valid leaf", () => {
    const sp = new URLSearchParams("for=prokaryote-raw-assembly")
    expect(parseForParam(sp)).toBe("prokaryote-raw-assembly")
  })

  it("returns the id for a valid intermediate question", () => {
    const sp = new URLSearchParams("for=microbial")
    expect(parseForParam(sp)).toBe("microbial")
  })

  it("rejects leaf-number ids like `leaf-18`", () => {
    const sp = new URLSearchParams("for=leaf-18")
    expect(parseForParam(sp)).toBeNull()
  })

  it("returns null for empty string", () => {
    const sp = new URLSearchParams("for=")
    expect(parseForParam(sp)).toBeNull()
  })
})

describe("isValidNodeId", () => {
  it("is true for all TREE_NODES ids", () => {
    for (const id of ALL_IDS) {
      expect(isValidNodeId(id)).toBe(true)
    }
  })

  it("is false for unknown ids", () => {
    expect(isValidNodeId("not-a-node")).toBe(false)
    expect(isValidNodeId("")).toBe(false)
    expect(isValidNodeId("LEAF-18")).toBe(false)
  })
})

describe("ALL_NODE_IDS", () => {
  it("covers every TREE_NODE id", () => {
    expect(ALL_NODE_IDS.size).toBe(TREE_NODES.length)
  })
})

describe("parseForParam (PBT)", () => {
  it("round-trips any known node id", () => {
    expect(() => fc.assert(
      fc.property(
        fc.constantFrom(...ALL_IDS),
        (id) => {
          const sp = new URLSearchParams(`for=${encodeURIComponent(id)}`)

          return parseForParam(sp) === id
        },
      ),
      { numRuns: 100 },
    )).not.toThrow()
  })

  it("returns null for any string that is not a known id", () => {
    expect(() => fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => !isValidNodeId(s)),
        (s) => {
          const sp = new URLSearchParams()
          sp.set("for", s)

          return parseForParam(sp) === null
        },
      ),
      { numRuns: 100 },
    )).not.toThrow()
  })
})
