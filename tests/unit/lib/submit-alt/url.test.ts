import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import { TREE_NODES_ALT } from "@/lib/mock-data/submit-alt-tree"
import {
  applyQAAnswersToParams,
  isValidQ1Id,
  isValidQ2Id,
  parseForParam,
  parseQAAnswers,
} from "@/lib/submit-alt/url"
import type { QAAnswers } from "@/types/submit-alt"

const ALL_NODE_IDS = TREE_NODES_ALT.map((n) => n.id)

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

describe("isValidQ1Id", () => {
  it("accepts valid Q1 ids", () => {
    expect(isValidQ1Id("sequence-read")).toBe(true)
    expect(isValidQ1Id("assembled")).toBe(true)
    expect(isValidQ1Id("mass-spec")).toBe(true)
  })

  it("rejects unknown values", () => {
    expect(isValidQ1Id("genome")).toBe(false)
    expect(isValidQ1Id("")).toBe(false)
  })
})

describe("isValidQ2Id", () => {
  it("accepts valid Q2 ids", () => {
    expect(isValidQ2Id("human")).toBe(true)
    expect(isValidQ2Id("eukaryote")).toBe(true)
  })

  it("rejects unknown values", () => {
    expect(isValidQ2Id("alien")).toBe(false)
  })
})

describe("parseQAAnswers", () => {
  it("returns empty answers when no params", () => {
    expect(parseQAAnswers(new URLSearchParams(""))).toEqual(emptyAnswers())
  })

  it("parses q1 CSV", () => {
    const result = parseQAAnswers(
      new URLSearchParams("q1=sequence-read,assembled"),
    )
    expect(result.q1).toEqual(new Set(["sequence-read", "assembled"]))
  })

  it("ignores invalid q1 values silently", () => {
    const result = parseQAAnswers(
      new URLSearchParams("q1=sequence-read,unknown,assembled"),
    )
    expect(result.q1).toEqual(new Set(["sequence-read", "assembled"]))
  })

  it("parses single-value q2-q9", () => {
    const result = parseQAAnswers(
      new URLSearchParams(
        "q2=eukaryote&q3=open&q4=primary&q5=normal&q7=proteomics&q8=raw&q9=no",
      ),
    )
    expect(result.q2).toBe("eukaryote")
    expect(result.q3).toBe("open")
    expect(result.q4).toBe("primary")
    expect(result.q5).toBe("normal")
    expect(result.q7).toBe("proteomics")
    expect(result.q8).toBe("raw")
    expect(result.q9).toBe("no")
  })

  it("parses q6 CSV (multi)", () => {
    const result = parseQAAnswers(new URLSearchParams("q6=haplotype,tsa"))
    expect(result.q6).toEqual(new Set(["haplotype", "tsa"]))
  })
})

describe("applyQAAnswersToParams", () => {
  it("writes all answers to params", () => {
    const params = new URLSearchParams()
    applyQAAnswersToParams(params, {
      q1: new Set(["sequence-read", "assembled"]),
      q2: "eukaryote",
      q3: "open",
      q4: "primary",
      q5: "normal",
      q6: new Set(["none"]),
      q7: null,
      q8: null,
      q9: null,
    })
    expect(params.get("q1")).toBe("sequence-read,assembled")
    expect(params.get("q2")).toBe("eukaryote")
    expect(params.get("q3")).toBe("open")
    expect(params.get("q4")).toBe("primary")
    expect(params.get("q5")).toBe("normal")
    expect(params.get("q6")).toBe("none")
    expect(params.get("q7")).toBeNull()
  })

  it("removes keys when value is null / empty set", () => {
    const params = new URLSearchParams(
      "q1=sequence-read&q2=eukaryote&q3=open",
    )
    applyQAAnswersToParams(params, emptyAnswers())
    expect(params.get("q1")).toBeNull()
    expect(params.get("q2")).toBeNull()
    expect(params.get("q3")).toBeNull()
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

describe("PBT: parseQAAnswers ↔ applyQAAnswersToParams round-trip for q2", () => {
  it("preserves single-value answers", () => {
    expect(() =>
      fc.assert(
        fc.property(
          fc.constantFrom(
            "human",
            "eukaryote",
            "prokaryote",
            "virus",
            "metagenome",
            "organelle-plasmid",
          ),
          (q2Value) => {
            const params = new URLSearchParams()
            applyQAAnswersToParams(params, {
              ...emptyAnswers(),
              q2: q2Value as QAAnswers["q2"],
            })

            return parseQAAnswers(params).q2 === q2Value
          },
        ),
        { numRuns: 50 },
      )).not.toThrow()
  })
})
