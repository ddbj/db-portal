import { describe, expect, it } from "vitest"

import { resolveMultiSelectPattern } from "@/lib/submit-alt/multi-select-patterns"
import type { QAAnswers } from "@/types/submit-alt"

const emptyAnswers = (): QAAnswers => ({
  q1: new Set(),
  q2: null,
  q3: null,
  q4: null,
  q5: null,
  q6: new Set(),
  q7: null,
  q8: null,
  q9: null,
})

describe("resolveMultiSelectPattern", () => {
  it("returns single for empty Q1", () => {
    expect(resolveMultiSelectPattern(emptyAnswers())).toBe("single")
  })

  it("returns single when only one Q1 is selected", () => {
    expect(
      resolveMultiSelectPattern({
        ...emptyAnswers(),
        q1: new Set(["sequence-read"]),
      }),
    ).toBe("single")
  })

  it("returns jga-unified for Q2=human + Q3=restricted with multiple Q1", () => {
    expect(
      resolveMultiSelectPattern({
        ...emptyAnswers(),
        q1: new Set(["sequence-read", "assembled"]),
        q2: "human",
        q3: "restricted",
      }),
    ).toBe("jga-unified")
  })

  it("returns fully-independent for mass-spec + proteomics + others", () => {
    expect(
      resolveMultiSelectPattern({
        ...emptyAnswers(),
        q1: new Set(["mass-spec", "sequence-read"]),
        q7: "proteomics",
      }),
    ).toBe("fully-independent")
  })

  it("returns fully-independent for variation + others", () => {
    expect(
      resolveMultiSelectPattern({
        ...emptyAnswers(),
        q1: new Set(["variation", "sequence-read"]),
      }),
    ).toBe("fully-independent")
  })

  it("returns shared-bp-bs for mass-spec + metabolomics + others", () => {
    expect(
      resolveMultiSelectPattern({
        ...emptyAnswers(),
        q1: new Set(["mass-spec", "assembled"]),
        q7: "metabolomics",
      }),
    ).toBe("shared-bp-bs")
  })

  it("returns merged-submission for sequence-read + assembled (no special types)", () => {
    expect(
      resolveMultiSelectPattern({
        ...emptyAnswers(),
        q1: new Set(["sequence-read", "assembled"]),
        q2: "eukaryote",
      }),
    ).toBe("merged-submission")
  })

  it("jga-unified takes precedence over proteomics", () => {
    expect(
      resolveMultiSelectPattern({
        ...emptyAnswers(),
        q1: new Set(["mass-spec", "sequence-read"]),
        q2: "human",
        q3: "restricted",
        q7: "proteomics",
      }),
    ).toBe("jga-unified")
  })
})
