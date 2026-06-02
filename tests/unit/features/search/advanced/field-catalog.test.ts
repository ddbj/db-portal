import { describe, expect, test } from "vitest"

import {
  FIELD_OPS,
  fieldsForScope,
  isAdvancedField,
} from "~/features/search/advanced/field-catalog"
import { DB_SLUGS } from "~/lib/search-scope"

const CROSS_FIELDS = fieldsForScope(null)

describe("fieldsForScope", () => {
  test("cross scope offers only cross fields, no Tier 3", () => {
    expect(CROSS_FIELDS).toContain("identifier")
    expect(CROSS_FIELDS).toContain("accessibility")
    expect(CROSS_FIELDS).not.toContain("instrument_model")
    expect(CROSS_FIELDS).not.toContain("object_type")
  })

  test("a per-DB scope adds that DB's Tier 3 fields and no other DB's", () => {
    const sra = fieldsForScope("sra")
    expect(sra).toContain("instrument_model")
    expect(sra).toContain("library_strategy")
    expect(sra).not.toContain("object_type") // bioproject only
    expect(sra).not.toContain("vendor") // jga only
  })

  test("a shared Tier 3 field appears under each of its DBs only", () => {
    expect(fieldsForScope("biosample")).toContain("geo_loc_name")
    expect(fieldsForScope("sra")).toContain("geo_loc_name")
    expect(fieldsForScope("bioproject")).not.toContain("geo_loc_name")
  })

  test("type is offered under sra and jga only", () => {
    expect(fieldsForScope("sra")).toContain("type")
    expect(fieldsForScope("jga")).toContain("type")
    expect(fieldsForScope("bioproject")).not.toContain("type")
    expect(fieldsForScope("metabobank")).not.toContain("type")
  })

  test("Solr-backed scopes (trad / taxonomy) get cross fields only", () => {
    expect(fieldsForScope("trad")).toEqual(CROSS_FIELDS)
    expect(fieldsForScope("taxonomy")).toEqual(CROSS_FIELDS)
  })

  test("publication is a cross field everywhere except biosample", () => {
    // publication.title nested is not merged into biosample, so single-DB biosample
    // is rejected by the API (field-not-available-for-db); the builder must drop it.
    expect(CROSS_FIELDS).toContain("publication")
    expect(fieldsForScope("biosample")).not.toContain("publication")
    for (const db of DB_SLUGS) {
      if (db === "biosample") continue
      expect(fieldsForScope(db)).toContain("publication")
    }
  })

  test("every scope includes all cross fields, minus per-DB exclusions", () => {
    for (const db of DB_SLUGS) {
      const scoped = fieldsForScope(db)
      for (const field of CROSS_FIELDS) {
        // biosample is the sole exclusion: publication.title nested is absent there.
        const excluded = db === "biosample" && field === "publication"
        expect(scoped.includes(field)).toBe(!excluded)
      }
    }
  })
})

describe("field operators and membership", () => {
  test("operator sets follow the field kind", () => {
    expect(FIELD_OPS.accessibility).toEqual(["eq"]) // enum
    expect(FIELD_OPS.identifier).toEqual(["eq", "wildcard"]) // identifier
    expect(FIELD_OPS.title).toEqual(["contains", "wildcard"]) // text
    expect(FIELD_OPS.date_published).toEqual(["between"]) // date
    expect(FIELD_OPS.library_strategy).toEqual(["eq"]) // Tier 3 enum
  })

  test("isAdvancedField recognizes catalog fields and rejects others", () => {
    expect(isAdvancedField("instrument_model")).toBe(true)
    expect(isAdvancedField("identifier")).toBe(true)
    expect(isAdvancedField("kingdom")).toBe(false) // Solr field, not in the builder catalog
    expect(isAdvancedField("not_a_field")).toBe(false)
  })
})
