import { describe, expect, test } from "vitest"

import {
  FIELD_OPS,
  fieldsForScope,
  isAdvancedField,
} from "~/features/search/advanced/field-catalog"
import { DB_SLUGS } from "~/lib/search-scope"

const CROSS_FIELDS = fieldsForScope(null)
// ES-backed single-DB scopes share the cross (Tier 1/2) fields; Solr-backed
// scopes (trad / taxonomy) carry their own curated fields instead.
const ES_DBS = DB_SLUGS.filter((db) => db !== "trad" && db !== "taxonomy")

describe("fieldsForScope", () => {
  test("cross scope offers the common fields, not identifier or Tier 3", () => {
    // identifier (accession) is not a filter field: its eq row never narrows, so
    // accession lookup lives in the keyword box and the cross exact-match card.
    expect(CROSS_FIELDS).not.toContain("identifier")
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

  test("Solr-backed scopes offer their own Solr fields, not degenerate ES fields", () => {
    const trad = fieldsForScope("trad")
    expect(trad).toContain("division")
    expect(trad).toContain("sequence_length")
    expect(trad).toContain("publication") // maps to the ARSA ReferenceTitle
    expect(trad).not.toContain("accessibility") // degenerate on Solr
    expect(trad).not.toContain("identifier")

    const taxonomy = fieldsForScope("taxonomy")
    expect(taxonomy).toContain("rank")
    expect(taxonomy).toContain("kingdom")
    expect(taxonomy).toContain("organism_id") // searchable by tax_id (facet-suppressed to text)
    expect(taxonomy).toContain("synonym") // TXSearch-only text field
    expect(taxonomy).not.toContain("accessibility") // degenerate on Solr
  })

  test("publication is a cross field on every ES scope except biosample", () => {
    // publication.title nested is not merged into biosample, so single-DB biosample
    // is rejected by the API (field-not-available-for-db); the builder must drop it.
    expect(CROSS_FIELDS).toContain("publication")
    expect(fieldsForScope("biosample")).not.toContain("publication")
    for (const db of ES_DBS) {
      if (db === "biosample") continue
      expect(fieldsForScope(db)).toContain("publication")
    }
  })

  test("every ES scope includes all cross fields, minus per-DB exclusions", () => {
    for (const db of ES_DBS) {
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
    expect(FIELD_OPS.sequence_length).toEqual(["between"]) // number
    expect(FIELD_OPS.library_strategy).toEqual(["eq"]) // Tier 3 enum
  })

  test("isAdvancedField recognizes registry fields (incl. Solr) and rejects others", () => {
    expect(isAdvancedField("instrument_model")).toBe(true)
    expect(isAdvancedField("identifier")).toBe(true)
    expect(isAdvancedField("kingdom")).toBe(true) // Solr field, now offered in the builder
    expect(isAdvancedField("not_a_field")).toBe(false)
  })
})
