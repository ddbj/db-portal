import { fc } from "@fast-check/vitest"

import type { ParseNode } from "~/lib/api"

const arbField = fc.constantFrom("organism", "identifier", "title", "description")

const arbDateField = fc.constantFrom("date_published", "date_modified", "date_created")

const arbValue = fc.string({ minLength: 1, maxLength: 12 }).filter((s) => !/[\s:()[\]"{}^~*?/]/.test(s))

const arbDate = fc.tuple(
  fc.integer({ min: 2000, max: 2030 }),
  fc.integer({ min: 1, max: 12 }),
  fc.integer({ min: 1, max: 28 }),
).map(([y, m, d]) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`)

const arbLeafValue: fc.Arbitrary<ParseNode> = fc.tuple(
  arbField,
  fc.constantFrom<"eq" | "contains" | "wildcard">("eq", "contains", "wildcard"),
  arbValue,
).map(([field, op, value]) => ({ op, field, value }))

const arbLeafRange: fc.Arbitrary<ParseNode> = fc.tuple(arbDateField, arbDate, arbDate)
  .map(([field, a, b]) => {
    const [from, to] = a <= b ? [a, b] : [b, a]

    return { op: "between" as const, field, from, to }
  })

const arbLeaf: fc.Arbitrary<ParseNode> = fc.oneof(arbLeafValue, arbLeafRange)

export const arbAst: fc.Arbitrary<ParseNode> = fc.letrec((tie) => ({
  node: fc.oneof(
    { depthSize: "small", withCrossShrink: true },
    arbLeaf,
    fc.record({
      op: fc.constantFrom<"AND" | "OR">("AND", "OR"),
      rules: fc.array(tie("node") as fc.Arbitrary<ParseNode>, { minLength: 1, maxLength: 4 }),
    }) as fc.Arbitrary<ParseNode>,
    fc.record({
      op: fc.constant("NOT" as const),
      rules: fc.tuple(tie("node") as fc.Arbitrary<ParseNode>).map(([single]) => [single]),
    }) as fc.Arbitrary<ParseNode>,
  ),
})).node as fc.Arbitrary<ParseNode>

export const arbLeafForAdvanced: fc.Arbitrary<ParseNode> = arbLeaf

export const arbLeafForSidebar: fc.Arbitrary<ParseNode> = fc.oneof(
  arbValue.map((value) => ({ op: "eq" as const, field: "organism", value })),
  arbValue.map((value) => ({ op: "eq" as const, field: "organization_name", value })),
  arbValue.map((value) => ({ op: "eq" as const, field: "library_strategy", value })),
  fc.tuple(arbDate, arbDate).map(([a, b]) => {
    const [from, to] = a <= b ? [a, b] : [b, a]

    return { op: "between" as const, field: "date_published", from, to }
  }),
)
