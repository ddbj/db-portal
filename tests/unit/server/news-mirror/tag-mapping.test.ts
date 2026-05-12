import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import { mapTags } from "@/server/news-mirror/tag-mapping"
import { SUPPORTED_TAGS } from "@/server/news-mirror/types"

describe("mapTags (ddbj)", () => {
  it("maps Japanese and English DDBJ tag synonyms to the same canonical key", () => {
    expect(mapTags(["お知らせ"], "ddbj").canonical).toEqual(["announcement"])
    expect(mapTags(["Announcement"], "ddbj").canonical).toEqual(["announcement"])
    expect(mapTags(["データ公開"], "ddbj").canonical).toEqual(["data-release"])
    expect(mapTags(["Data Release"], "ddbj").canonical).toEqual(["data-release"])
    expect(mapTags(["メンテナンス"], "ddbj").canonical).toEqual(["maintenance"])
    expect(mapTags(["Maintenance"], "ddbj").canonical).toEqual(["maintenance"])
  })

  it("drops unknown tags into dropped[]", () => {
    const result = mapTags(["お知らせ", "WeirdTag"], "ddbj")
    expect(result.canonical).toEqual(["announcement"])
    expect(result.dropped).toEqual(["WeirdTag"])
  })

  it("deduplicates same canonical key from multiple raw synonyms", () => {
    const result = mapTags(["お知らせ", "Announcement"], "ddbj")
    expect(result.canonical).toEqual(["announcement"])
  })

  it("trims whitespace before lookup", () => {
    expect(mapTags(["  Announcement  "], "ddbj").canonical).toEqual(["announcement"])
  })
})

describe("mapTags (dbcls)", () => {
  it("maps dbcls tag values to canonical keys", () => {
    expect(mapTags(["public_relations"], "dbcls").canonical).toEqual(["announcement"])
    expect(mapTags(["services"], "dbcls").canonical).toEqual(["service"])
    expect(mapTags(["events"], "dbcls").canonical).toEqual(["event"])
    expect(mapTags(["registration"], "dbcls").canonical).toEqual(["recruitment"])
    expect(mapTags(["other"], "dbcls").canonical).toEqual(["other"])
  })

  it("dbcls dictionary does not include ddbj synonyms (so they are dropped)", () => {
    const result = mapTags(["お知らせ", "Announcement"], "dbcls")
    expect(result.canonical).toEqual([])
    expect(result.dropped).toEqual(["お知らせ", "Announcement"])
  })

  it("ddbj dictionary does not include dbcls keys (so they are dropped)", () => {
    const result = mapTags(["services", "public_relations"], "ddbj")
    expect(result.canonical).toEqual([])
    expect(result.dropped).toEqual(["services", "public_relations"])
  })
})

describe("mapTags property-based", () => {
  it("canonical output is always a subset of SUPPORTED_TAGS", () => {
    fc.assert(fc.property(
      fc.array(fc.string(), { maxLength: 10 }),
      fc.constantFrom("ddbj" as const, "dbcls" as const),
      (rawTags, source) => {
        const result = mapTags(rawTags, source)
        for (const c of result.canonical) {
          expect(SUPPORTED_TAGS).toContain(c)
        }
      },
    ))
  })

  it("the union of canonical and dropped reflects non-empty trimmed input", () => {
    fc.assert(fc.property(
      fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 8 }),
      fc.constantFrom("ddbj" as const, "dbcls" as const),
      (rawTags, source) => {
        const result = mapTags(rawTags, source)
        const nonEmpty = rawTags.filter((t) => t.trim().length > 0)
        // canonical はユニーク化されるので長さは ≤ nonEmpty.length
        expect(result.canonical.length).toBeLessThanOrEqual(nonEmpty.length)
        expect(result.dropped.length).toBeLessThanOrEqual(nonEmpty.length)
      },
    ))
  })
})
