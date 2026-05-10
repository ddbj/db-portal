import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import { DATA_TYPE_IDS } from "@/lib/mock-data/submit-alt-tree"
import { resolveMultiSelectPattern } from "@/lib/submit-alt/multi-select-patterns"
import type { DataTypeId } from "@/types/submit-alt"

describe("resolveMultiSelectPattern", () => {
  it("returns single for empty selection", () => {
    expect(resolveMultiSelectPattern(new Set(), false)).toBe("single")
  })

  it("returns single for one item", () => {
    expect(resolveMultiSelectPattern(new Set(["genome"]), false)).toBe("single")
  })

  it("returns jga-unified when human-restricted is included", () => {
    expect(
      resolveMultiSelectPattern(new Set(["human-restricted", "genome"]), false),
    ).toBe("jga-unified")
  })

  it("jga-unified takes precedence over proteomics", () => {
    expect(
      resolveMultiSelectPattern(
        new Set(["human-restricted", "proteomics"]),
        false,
      ),
    ).toBe("jga-unified")
  })

  it("returns fully-independent for proteomics + others", () => {
    expect(
      resolveMultiSelectPattern(new Set(["proteomics", "genome"]), false),
    ).toBe("fully-independent")
  })

  it("returns fully-independent for non-human variation + others", () => {
    expect(
      resolveMultiSelectPattern(new Set(["variation", "genome"]), false),
    ).toBe("fully-independent")
  })

  it("returns merged-submission for human variation (humanOnly=true)", () => {
    expect(
      resolveMultiSelectPattern(new Set(["variation", "genome"]), true),
    ).toBe("merged-submission")
  })

  it("returns shared-bp-bs for metabolomics + others", () => {
    expect(
      resolveMultiSelectPattern(new Set(["metabolomics", "genome"]), false),
    ).toBe("shared-bp-bs")
  })

  it("returns merged-submission for genome + sequence-read", () => {
    expect(
      resolveMultiSelectPattern(
        new Set(["genome", "sequence-read"]),
        false,
      ),
    ).toBe("merged-submission")
  })
})

describe("PBT: resolveMultiSelectPattern", () => {
  it("never returns single when 2 or more types are selected", () => {
    expect(() =>
      fc.assert(
        fc.property(
          fc.subarray(DATA_TYPE_IDS.slice(), { minLength: 2, maxLength: 5 }),
          fc.boolean(),
          (subset, human) => {
            const set: ReadonlySet<DataTypeId> = new Set(subset)
            if (set.size < 2) return true

            return resolveMultiSelectPattern(set, human) !== "single"
          },
        ),
        { numRuns: 100 },
      )).not.toThrow()
  })

  it("always returns jga-unified if human-restricted is in the set with at least one more type", () => {
    expect(() =>
      fc.assert(
        fc.property(
          fc.subarray(
            DATA_TYPE_IDS.filter((id) => id !== "human-restricted").slice(),
            { minLength: 1, maxLength: 5 },
          ),
          fc.boolean(),
          (rest, human) => {
            const set: ReadonlySet<DataTypeId> = new Set([
              "human-restricted",
              ...rest,
            ])

            return resolveMultiSelectPattern(set, human) === "jga-unified"
          },
        ),
        { numRuns: 100 },
      )).not.toThrow()
  })
})
