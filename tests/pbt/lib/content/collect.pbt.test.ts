import { fc, test } from "@fast-check/vitest"
import { describe, expect } from "vitest"
import { z } from "zod"

import { collectFromModules } from "~/lib/content"

const Item = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  value: z.number().int(),
})

const arbValidItem = fc.record({
  slug: fc.stringMatching(/^[a-z][a-z0-9-]{0,8}$/),
  value: fc.integer({ min: 0, max: 10_000 }),
})

const arbInvalidItem = fc.record({
  slug: fc.constantFrom("UPPER", "with space", ""),
  value: fc.integer({ min: 0, max: 10 }),
})

const arbModules = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 16 }).map((s) => `/x/${s}.content.ts`),
  arbValidItem.map((default_) => ({ default: default_ })),
  { minKeys: 0, maxKeys: 8 },
)

describe("collectFromModules PBT", () => {
  test.prop([arbModules], { numRuns: 200 })(
    "collectFromModules_allValid_alwaysReturnsOkWithSameLength",
    (modules) => {
      const result = collectFromModules(Item, modules)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.items.length).toBe(Object.keys(modules).length)
      }
    },
  )

  test.prop([arbValidItem, arbInvalidItem], { numRuns: 200 })(
    "collectFromModules_anyInvalid_returnsFailureWithThatFile",
    (validItem, invalidItem) => {
      const modules = {
        "/x/ok.content.ts": { default: validItem },
        "/x/bad.content.ts": { default: invalidItem },
      }
      const result = collectFromModules(Item, modules)
      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.errors.some((e) => e.filepath.includes("bad"))).toBe(true)
      }
    },
  )

  test.prop([arbModules], { numRuns: 100 })(
    "collectFromModules_idempotent_secondCallEquivalentSlugs",
    (modules) => {
      const a = collectFromModules(Item, modules)
      const b = collectFromModules(Item, modules)
      expect(a.ok).toBe(b.ok)
      if (a.ok && b.ok) {
        expect(a.items.map((i) => i.content.slug).sort()).toEqual(b.items.map((i) => i.content.slug).sort())
      }
    },
  )
})
