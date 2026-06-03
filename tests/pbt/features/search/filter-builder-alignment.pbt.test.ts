import { fc, test } from "@fast-check/vitest"
import { describe, expect } from "vitest"

import {
  fieldLabelKey,
  fieldsForScope,
  isAdvancedField,
} from "~/features/search/advanced/field-catalog"
import { scopeFilters } from "~/features/search/sidebar/facet-config"
import { DB_SLUGS, type DbSlug } from "~/lib/search-scope"

// The Sidebar filter and the Advanced builder both derive from the single field
// registry, so for every scope they must offer the same fields and label each the
// same way. These properties fail if the two surfaces ever drift apart.
const SCOPES: (DbSlug | null)[] = [null, ...DB_SLUGS]

describe("filter / builder field alignment", () => {
  test.prop([fc.constantFrom(...SCOPES)])(
    "alignment_everyScope_offersTheSameFieldSet",
    (db) => {
      const builder = [...fieldsForScope(db)].sort()
      const sidebar = scopeFilters(db).map((row) => row.dslField).sort()
      expect(builder).toEqual(sidebar)
    },
  )

  test.prop([fc.constantFrom(...SCOPES)])(
    "alignment_everyScope_sameFieldSharesOneLabelKey",
    (db) => {
      for (const row of scopeFilters(db)) {
        // Every sidebar field is a builder field, and both resolve their label
        // through the same key (search.fields.*), so the label can never differ.
        expect(isAdvancedField(row.dslField)).toBe(true)
        if (isAdvancedField(row.dslField)) {
          expect(fieldLabelKey(row.dslField)).toBe(row.key)
        }
      }
    },
  )
})
