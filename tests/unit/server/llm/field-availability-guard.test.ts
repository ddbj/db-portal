import { describe, expect, test } from "vitest"

import { isFieldNotAvailableForDb, pruneUnavailableFields } from "../../../../server/llm/assistant/field-availability-guard"

describe("pruneUnavailableFields", () => {
  test("taxonomy: drops a date clause, keeps the Tier-3 field", () => {
    expect(pruneUnavailableFields("rank:species AND date_published:[2020-01-01 TO 9999-12-31]", "taxonomy"))
      .toBe("rank:species")
  })

  test("taxonomy: drops every unsupported cross field (date / submitter / publication)", () => {
    expect(pruneUnavailableFields(
      "domain:Archaea AND date_published:[2020-01-01 TO 9999-12-31] AND submitter:RIKEN AND publication:cancer",
      "taxonomy",
    )).toBe("domain:Archaea")
  })

  test("taxonomy: organism_id is kept (it resolves to the TXSearch tax_id, not unavailable)", () => {
    expect(pruneUnavailableFields("organism_id:9606 AND rank:species", "taxonomy")).toBeNull()
  })

  test("trad: drops organism_id and name but keeps date_published (trad's only valid date)", () => {
    expect(pruneUnavailableFields(
      "organism_id:9606 AND molecular_type:mRNA AND name:foo AND date_published:[2020-01-01 TO 9999-12-31]",
      "trad",
    )).toBe("molecular_type:mRNA AND date_published:[2020-01-01 TO 9999-12-31]")
  })

  test("trad: drops date_modified (unavailable) — boundary against taxonomy keeping no date", () => {
    expect(pruneUnavailableFields("division:HUM AND date_modified:[2024-01-01 TO 9999-12-31]", "trad"))
      .toBe("division:HUM")
  })

  test("biosample: drops only publication, keeps the sample fields and dates", () => {
    expect(pruneUnavailableFields(
      "host:human AND publication:cancer AND date_created:[2020-01-01 TO 9999-12-31]",
      "biosample",
    )).toBe("host:human AND date_created:[2020-01-01 TO 9999-12-31]")
  })

  test("a NOT-prefixed unsupported clause is dropped too", () => {
    expect(pruneUnavailableFields("rank:species AND NOT date_modified:[2024-01-01 TO 9999-12-31]", "taxonomy"))
      .toBe("rank:species")
  })

  test("an AND inside a quoted value is not treated as a separator", () => {
    expect(pruneUnavailableFields("name:\"x AND y\" AND genus:\"Homo AND co\"", "taxonomy"))
      .toBe("genus:\"Homo AND co\"")
  })

  test("an unsupported field nested in an OR-group is left intact (no wrong rewrite)", () => {
    // The paren group is not a bare leaf, so the guard does not surgically edit it; the
    // top-level date is dropped and the OR-set survives unchanged.
    expect(pruneUnavailableFields(
      "(rank:genus OR rank:family) AND date_published:[2020-01-01 TO 9999-12-31]",
      "taxonomy",
    )).toBe("(rank:genus OR rank:family)")
  })

  test("returns null when nothing is unsupported (no needless rewrite)", () => {
    expect(pruneUnavailableFields("rank:species AND common_name:salmon", "taxonomy")).toBeNull()
  })

  test("returns null when every conjunct is unsupported (query has nothing left to search)", () => {
    expect(pruneUnavailableFields("date_published:[2020-01-01 TO 9999-12-31] AND submitter:RIKEN", "taxonomy"))
      .toBeNull()
  })

  test("returns null for a DB that serves all cross fields", () => {
    expect(pruneUnavailableFields("organism_name:\"Homo sapiens\" AND date_published:[2020-01-01 TO 9999-12-31]", "sra"))
      .toBeNull()
  })

  test("returns null for cross scope (db = null)", () => {
    expect(pruneUnavailableFields("organism_name:\"Homo sapiens\" AND date_published:[2020-01-01 TO 9999-12-31]", null))
      .toBeNull()
  })
})

describe("isFieldNotAvailableForDb", () => {
  test("matches the for-db problem type, not the cross-db one", () => {
    expect(isFieldNotAvailableForDb("https://ddbj.nig.ac.jp/problems/field-not-available-for-db")).toBe(true)
    expect(isFieldNotAvailableForDb("https://ddbj.nig.ac.jp/problems/field-not-available-in-cross-db")).toBe(false)
    expect(isFieldNotAvailableForDb("https://ddbj.nig.ac.jp/problems/invalid-freetext-position")).toBe(false)
    expect(isFieldNotAvailableForDb(undefined)).toBe(false)
  })
})
