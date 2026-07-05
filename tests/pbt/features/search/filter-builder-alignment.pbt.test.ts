import { describe, expect, test } from "vitest"

import type { AdvancedField } from "~/features/search/advanced/field-catalog"
import {
  fieldLabelKey,
  fieldsForScope,
  isAdvancedField,
} from "~/features/search/advanced/field-catalog"
import { scopeFilters } from "~/features/search/sidebar/facet-config"
import { DB_SLUGS, type DbSlug } from "~/lib/search-scope"

// The Sidebar filter and the Advanced builder both derive from the single field
// registry, so for every scope they must offer the same fields and label each the
// same way. Enumerate all scopes deterministically (fc.constantFrom over a 8-element
// domain leaves gaps under random sampling).
const SCOPES: (DbSlug | null)[] = [null, ...DB_SLUGS]

describe("filter / builder field alignment", () => {
  test.each(SCOPES.map((s) => [s]))(
    "alignment_scope_%s_offersTheSameFieldSet",
    (db) => {
      const builder = [...fieldsForScope(db)].sort()
      const sidebar = scopeFilters(db).map((row) => row.dslField).sort()
      expect(builder).toEqual(sidebar)
    },
  )

  test.each(SCOPES.map((s) => [s]))(
    "alignment_scope_%s_sameFieldSharesOneLabelKey",
    (db) => {
      for (const row of scopeFilters(db)) {
        // Every sidebar field is a builder field, and both resolve their label
        // through the same key (search.fields.*), so the label can never differ.
        // `as AdvancedField` は直上の assertion が true を通した後の narrowing
        // (`if` 分岐にすると vitest/no-conditional-expect に引っかかる)。
        expect(isAdvancedField(row.dslField)).toBe(true)
        expect(fieldLabelKey(row.dslField as AdvancedField)).toBe(row.key)
      }
    },
  )
})
