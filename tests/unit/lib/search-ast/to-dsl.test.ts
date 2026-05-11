import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
  boolAnd,
  boolNot,
  boolOr,
  fieldBetween,
  fieldContains,
  fieldEq,
  fieldWildcard,
  freeText,
} from "@/lib/search-ast/factory"
import { astToDsl, escapePhrase, needsPhrase } from "@/lib/search-ast/to-dsl"

describe("escapePhrase", () => {
  it("escapes double quotes and backslashes", () => {
    expect(escapePhrase('He said "hi"')).toBe('He said \\"hi\\"')
    expect(escapePhrase("path\\to\\file")).toBe("path\\\\to\\\\file")
  })

  it("returns input unchanged when no special chars", () => {
    expect(escapePhrase("cancer")).toBe("cancer")
    expect(escapePhrase("")).toBe("")
  })
})

describe("needsPhrase", () => {
  it.each([
    ["cancer", false],
    ["abc_123", false],
    ["sra-experiment", false],
    ["v1.2.3", false],
    ["Homo sapiens", true],
    ["a/b", true],
    ["", true],
  ])("needsPhrase(%j) === %j", (input, expected) => {
    expect(needsPhrase(input)).toBe(expected)
  })
})

describe("astToDsl - FreeText", () => {
  it("always wraps FreeText in double quotes (safe by construction)", () => {
    expect(astToDsl(freeText("cancer"))).toBe('"cancer"')
    expect(astToDsl(freeText("Homo sapiens"))).toBe('"Homo sapiens"')
    expect(astToDsl(freeText("organism:Homo")))
      .toBe('"organism:Homo"')
  })

  it("escapes embedded quotes and backslashes", () => {
    expect(astToDsl(freeText('He said "hi"')))
      .toBe('"He said \\"hi\\""')
    expect(astToDsl(freeText("path\\to\\file")))
      .toBe('"path\\\\to\\\\file"')
  })
})

describe("astToDsl - FieldClause leaf", () => {
  it("eq with bare value", () => {
    expect(astToDsl(fieldEq("title", "cancer"))).toBe("title:cancer")
  })

  it("eq with phrase value (auto-quoted)", () => {
    expect(astToDsl(fieldEq("organism", "Homo sapiens")))
      .toBe('organism:"Homo sapiens"')
  })

  it("contains uses field:value syntax (compiler discriminates by field type)", () => {
    expect(astToDsl(fieldContains("title", "cancer"))).toBe("title:cancer")
  })

  it("wildcard never quotes (preserve * and ?)", () => {
    expect(astToDsl(fieldWildcard("identifier", "PRJ*"))).toBe("identifier:PRJ*")
    expect(astToDsl(fieldWildcard("identifier", "PRJ?B"))).toBe("identifier:PRJ?B")
  })
})

describe("astToDsl - FieldClause range", () => {
  it("between with both ends", () => {
    expect(astToDsl(fieldBetween("date_published", "2020-01-01", "2024-12-31")))
      .toBe("date_published:[2020-01-01 TO 2024-12-31]")
  })

  it("between with from='*' (== lte)", () => {
    expect(astToDsl(fieldBetween("date_published", "*", "2024-12-31")))
      .toBe("date_published:[* TO 2024-12-31]")
  })

  it("between with to='*' (== gte)", () => {
    expect(astToDsl(fieldBetween("date_published", "2020-01-01", "*")))
      .toBe("date_published:[2020-01-01 TO *]")
  })
})

describe("astToDsl - BoolOp", () => {
  it("AND of two leaves: no parens around children", () => {
    expect(
      astToDsl(boolAnd([
        fieldEq("title", "cancer"),
        fieldEq("organism", "Homo sapiens"),
      ])),
    ).toBe('title:cancer AND organism:"Homo sapiens"')
  })

  it("OR wraps all children in parens (parent = OR, children leaves stay bare)", () => {
    expect(
      astToDsl(boolOr([
        fieldEq("title", "cancer"),
        fieldEq("title", "tumor"),
      ])),
    ).toBe("title:cancer OR title:tumor")
  })

  it("OR inside AND: OR child wrapped in parens", () => {
    expect(
      astToDsl(boolAnd([
        fieldEq("organism", "Homo sapiens"),
        boolOr([
          fieldEq("title", "cancer"),
          fieldEq("title", "tumor"),
        ]),
      ])),
    ).toBe('organism:"Homo sapiens" AND (title:cancer OR title:tumor)')
  })

  it("NOT of leaf: bare", () => {
    expect(astToDsl(boolNot(fieldEq("title", "cancer"))))
      .toBe("NOT title:cancer")
  })

  it("NOT of BoolOp: child wrapped in parens", () => {
    expect(
      astToDsl(boolNot(boolOr([
        fieldEq("title", "cancer"),
        fieldEq("title", "tumor"),
      ]))),
    ).toBe("NOT (title:cancer OR title:tumor)")
  })

  it("AND of FreeText + FieldClause", () => {
    expect(
      astToDsl(boolAnd([
        freeText("cancer"),
        fieldEq("organism", "Homo sapiens"),
      ])),
    ).toBe('"cancer" AND organism:"Homo sapiens"')
  })

  it("empty AND returns empty string", () => {
    expect(astToDsl(boolAnd([]))).toBe("")
  })

  it("singleton AND collapses to child DSL", () => {
    expect(astToDsl(boolAnd([fieldEq("title", "cancer")])))
      .toBe("title:cancer")
  })

  it("null returns empty string", () => {
    expect(astToDsl(null)).toBe("")
  })
})

describe("astToDsl PBT", () => {
  it("never throws on any well-formed AST", () => {
    const arbValue = fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0)
    const arbField = fc.constantFrom("title", "organism", "identifier", "date_published")
    const arbLeaf = fc.oneof(
      fc.tuple(arbField, arbValue).map(([f, v]) => fieldEq(f, v)),
      fc.tuple(arbField, arbValue).map(([f, v]) => fieldContains(f, v)),
    )
    expect(() => fc.assert(
      fc.property(arbLeaf, (n) => {
        const dsl = astToDsl(n)
        expect(dsl.length).toBeGreaterThan(0)
      }),
      { numRuns: 100 },
    )).not.toThrow()
  })
})
