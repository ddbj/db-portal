import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
  DATA_TYPE_IDS,
  TREE_NODES_ALT,
} from "@/lib/mock-data/submit-alt-tree"
import {
  isValidDataTypeId,
  parseForParam,
  parseHumanParam,
  parseTypesParam,
  serializeTypes,
} from "@/lib/submit-alt/url"

const ALL_NODE_IDS = TREE_NODES_ALT.map((n) => n.id)

describe("isValidDataTypeId", () => {
  it("is true for every DATA_TYPE_ID", () => {
    for (const id of DATA_TYPE_IDS) {
      expect(isValidDataTypeId(id)).toBe(true)
    }
  })

  it("is false for unknown values", () => {
    expect(isValidDataTypeId("not-a-type")).toBe(false)
    expect(isValidDataTypeId("")).toBe(false)
    expect(isValidDataTypeId("GENOME")).toBe(false)
  })
})

describe("parseTypesParam", () => {
  it("returns empty Set when types is absent", () => {
    expect(parseTypesParam(new URLSearchParams("")).size).toBe(0)
  })

  it("returns empty Set when value is empty string", () => {
    expect(parseTypesParam(new URLSearchParams("types=")).size).toBe(0)
  })

  it("parses a single id", () => {
    const sp = new URLSearchParams("types=genome")
    expect(parseTypesParam(sp)).toEqual(new Set(["genome"]))
  })

  it("parses multiple ids", () => {
    const sp = new URLSearchParams("types=genome,sequence-read,human-restricted")
    expect(parseTypesParam(sp)).toEqual(
      new Set(["genome", "sequence-read", "human-restricted"]),
    )
  })

  it("drops invalid ids silently", () => {
    const sp = new URLSearchParams("types=genome,bogus,sequence-read")
    expect(parseTypesParam(sp)).toEqual(new Set(["genome", "sequence-read"]))
  })
})

describe("parseHumanParam", () => {
  it("returns true only for human=1", () => {
    expect(parseHumanParam(new URLSearchParams("human=1"))).toBe(true)
  })

  it("returns false for any other value or absence", () => {
    expect(parseHumanParam(new URLSearchParams("human=0"))).toBe(false)
    expect(parseHumanParam(new URLSearchParams("human=true"))).toBe(false)
    expect(parseHumanParam(new URLSearchParams(""))).toBe(false)
  })
})

describe("parseForParam", () => {
  it("returns null when absent", () => {
    expect(parseForParam(new URLSearchParams(""))).toBeNull()
  })

  it("returns null for invalid id", () => {
    expect(parseForParam(new URLSearchParams("for=bogus"))).toBeNull()
  })

  it("returns id for valid leaf", () => {
    expect(parseForParam(new URLSearchParams("for=eukaryote-raw-assembly"))).toBe(
      "eukaryote-raw-assembly",
    )
  })

  it("returns id for valid question node", () => {
    expect(parseForParam(new URLSearchParams("for=genome"))).toBe("genome")
  })

  it("rejects legacy id like `leaf-26`", () => {
    expect(parseForParam(new URLSearchParams("for=leaf-26"))).toBeNull()
  })
})

describe("serializeTypes", () => {
  it("returns null for empty Set", () => {
    expect(serializeTypes(new Set())).toBeNull()
  })

  it("orders by DATA_TYPE_IDS canonical order regardless of input order", () => {
    expect(serializeTypes(new Set(["genome", "human-restricted"]))).toBe(
      "human-restricted,genome",
    )
    expect(serializeTypes(new Set(["small-sequence", "human-restricted"]))).toBe(
      "human-restricted,small-sequence",
    )
  })
})

describe("PBT: serializeTypes ↔ parseTypesParam round-trip", () => {
  it("preserves the input set", () => {
    expect(() =>
      fc.assert(
        fc.property(
          fc.subarray(DATA_TYPE_IDS.slice(), {
            minLength: 0,
            maxLength: DATA_TYPE_IDS.length,
          }),
          (subset) => {
            const set = new Set(subset)
            const serialized = serializeTypes(set)
            const sp = new URLSearchParams()
            if (serialized !== null) sp.set("types", serialized)
            const parsed = parseTypesParam(sp)

            return (
              parsed.size === set.size
              && [...parsed].every((x) => set.has(x))
            )
          },
        ),
        { numRuns: 100 },
      )).not.toThrow()
  })
})

describe("PBT: parseForParam round-trip for known ids", () => {
  it("returns the input id back for any tree node", () => {
    expect(() =>
      fc.assert(
        fc.property(fc.constantFrom(...ALL_NODE_IDS), (id) => {
          const sp = new URLSearchParams(`for=${encodeURIComponent(id)}`)

          return parseForParam(sp) === id
        }),
        { numRuns: 100 },
      )).not.toThrow()
  })
})
