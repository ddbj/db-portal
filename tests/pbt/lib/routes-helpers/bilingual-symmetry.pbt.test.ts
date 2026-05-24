import { fc, test } from "@fast-check/vitest"
import { describe, expect } from "vitest"

import { type BilingualEntry, bilingualRoutes } from "~/lib/routes-helpers"

const baseIdArb = fc.stringMatching(/^[a-z][a-z0-9-]{0,12}$/)
const fileArb = fc.constantFrom(
  "routes/top/route.tsx",
  "routes/search/route.tsx",
  "routes/submit/route.tsx",
  "routes/news/route.tsx",
)
const pathArb = fc.constantFrom("search", "submit", "news", "databases/:slug", "search/results")

const entryArb: fc.Arbitrary<BilingualEntry> = fc.oneof(
  fc.record({
    kind: fc.constant("index" as const),
    file: fileArb,
    baseId: baseIdArb,
  }),
  fc.record({
    kind: fc.constant("route" as const),
    path: pathArb,
    file: fileArb,
    baseId: baseIdArb,
  }),
)

type RawEntry = {
  file?: string
  id?: string
  path?: string
  children?: RawEntry[]
}

describe("bilingualRoutes", () => {
  test.prop([fc.array(entryArb, { minLength: 0, maxLength: 5 })])(
    "bilingualRoutes_outputLengthMatchesEntriesPlusOneLayout",
    (entries) => {
      const result = bilingualRoutes(entries) as unknown as RawEntry[]
      expect(result.length).toBe(entries.length + 1)
    },
  )

  test.prop([fc.array(entryArb, { minLength: 0, maxLength: 5 })])(
    "bilingualRoutes_lastEntryIsLangEnLayout",
    (entries) => {
      const result = bilingualRoutes(entries) as unknown as RawEntry[]
      const last = result[result.length - 1]
      expect(last?.path).toBe("en")
      expect(last?.file).toBe("routes/lang-en/layout.tsx")
      const children = last?.children ?? []
      expect(children.length).toBe(entries.length)
    },
  )

  test.prop([fc.array(entryArb, { minLength: 1, maxLength: 5 })])(
    "bilingualRoutes_enChildIdsEndWithBaseIdEnSuffix",
    (entries) => {
      const result = bilingualRoutes(entries) as unknown as RawEntry[]
      const last = result[result.length - 1]
      const children = last?.children ?? []
      entries.forEach((entry, i) => {
        expect(children[i]?.id).toBe(`${entry.baseId}.en`)
      })
    },
  )

  test.prop([fc.array(entryArb, { minLength: 1, maxLength: 5 })])(
    "bilingualRoutes_jaAndEnEntriesShareFile",
    (entries) => {
      const result = bilingualRoutes(entries) as unknown as RawEntry[]
      const last = result[result.length - 1]
      const enChildren = last?.children ?? []
      entries.forEach((entry, i) => {
        expect(result[i]?.file).toBe(entry.file)
        expect(enChildren[i]?.file).toBe(entry.file)
      })
    },
  )

  test.prop([fc.array(entryArb, { minLength: 1, maxLength: 5 })])(
    "bilingualRoutes_jaEntryDoesNotCarryEnId",
    (entries) => {
      const result = bilingualRoutes(entries) as unknown as RawEntry[]
      entries.forEach((_, i) => {
        const id = result[i]?.id
        if (id !== undefined) {
          expect(id.endsWith(".en")).toBe(false)
        }
      })
    },
  )
})
