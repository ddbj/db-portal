import fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
  ADVANCED_FIELDS,
  fieldLabelKey,
  findField,
  getFieldsForDb,
  getFieldsForTier,
  isFieldAvailableForDb,
  isTier3,
} from "@/lib/mock-data/advanced-search-fields"
import { ALL_DB_VALUE } from "@/lib/search-url"
import { DB_ORDER } from "@/types/db"

describe("ADVANCED_FIELDS catalog", () => {
  it("Tier 1 フィールドが 8 個で正しい id", () => {
    const tier1 = getFieldsForTier(1)
    expect(tier1.map((f) => f.id)).toEqual([
      "identifier",
      "title",
      "description",
      "organism",
      "date_published",
      "date_modified",
      "date_created",
      "date",
    ])
  })

  it("Tier 2 フィールドは submitter / publication の 2 個", () => {
    const tier2 = getFieldsForTier(2)
    expect(tier2.map((f) => f.id)).toEqual(["submitter", "publication"])
  })

  it("identifier / title / description は全 8 DB で利用可", () => {
    for (const id of ["identifier", "title", "description"]) {
      const field = findField(id)
      expect(field).toBeDefined()
      expect(field?.availableDbs).toEqual(DB_ORDER)
    }
  })

  it("organism / date_* は Taxonomy 以外の 7 DB で利用可", () => {
    const expected = DB_ORDER.filter((d) => d !== "taxonomy")
    for (const id of ["organism", "date_published", "date_modified", "date_created", "date"]) {
      const field = findField(id)
      expect(field?.availableDbs).toEqual(expected)
    }
  })

  it("Tier 3 フィールドは availableDbs に含まれる DB が 1-2 個のみ", () => {
    const tier3 = getFieldsForTier(3)
    for (const f of tier3) {
      expect(f.availableDbs.length).toBeGreaterThanOrEqual(1)
      expect(f.availableDbs.length).toBeLessThanOrEqual(2)
    }
  })

  it("enum 型フィールドは equals / not_equals のみ", () => {
    const enums = ADVANCED_FIELDS.filter((f) => f.type === "enum")
    expect(enums.length).toBeGreaterThan(0)
    for (const f of enums) {
      expect([...f.availableOps].sort()).toEqual(["equals", "not_equals"].sort())
      expect(f.enumValues).toBeDefined()
    }
  })

  it("enumValues は空配列のとき自由入力モード (relevance のみ)", () => {
    const freeFormEnums = ADVANCED_FIELDS.filter(
      (f) => f.type === "enum" && (f.enumValues ?? []).length === 0,
    )
    expect(freeFormEnums.map((f) => f.id)).toEqual(["relevance"])
  })

  it("date 型フィールドは between / gte / lte / equals", () => {
    const dates = ADVANCED_FIELDS.filter((f) => f.type === "date")
    for (const f of dates) {
      expect([...f.availableOps].sort()).toEqual(
        ["between", "equals", "gte", "lte"].sort(),
      )
    }
  })

  it("number 型フィールドは between / gte / lte / equals", () => {
    const numbers = ADVANCED_FIELDS.filter((f) => f.type === "number")
    expect(numbers.length).toBeGreaterThan(0)
    for (const f of numbers) {
      expect([...f.availableOps].sort()).toEqual(
        ["between", "equals", "gte", "lte"].sort(),
      )
    }
  })

  it("identifier 型フィールドは equals / starts_with / wildcard", () => {
    const ids = ADVANCED_FIELDS.filter((f) => f.type === "identifier")
    for (const f of ids) {
      expect([...f.availableOps].sort()).toEqual(
        ["equals", "starts_with", "wildcard"].sort(),
      )
    }
  })

  it("id は全フィールドで一意", () => {
    const ids = ADVANCED_FIELDS.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("grant_agency は bioproject と jga の 2 フィールドで dslName 共有", () => {
    const bioproject = findField("bioproject_grant_agency")
    const jga = findField("jga_grant_agency")
    expect(bioproject?.dslName).toBe("grant_agency")
    expect(jga?.dslName).toBe("grant_agency")
    expect(bioproject?.availableDbs).toEqual(["bioproject"])
    expect(jga?.availableDbs).toEqual(["jga"])
  })

  it("Tier 3 は全 6 DB（SRA/GEA 共通、BioSample、BioProject、Trad、Taxonomy、JGA）をカバー", () => {
    const tier3 = getFieldsForTier(3)
    const dbCoverage = new Set<string>()
    for (const f of tier3) {
      for (const db of f.availableDbs) dbCoverage.add(db)
    }
    expect(dbCoverage).toEqual(
      new Set(["sra", "gea", "biosample", "bioproject", "trad", "taxonomy", "jga"]),
    )
  })

  it("enum 値の value は各フィールド内で一意", () => {
    const enums = ADVANCED_FIELDS.filter((f) => f.type === "enum")
    for (const f of enums) {
      const values = (f.enumValues ?? []).map((e) => e.value)
      expect(new Set(values).size).toBe(values.length)
    }
  })

  it("全フィールドの tier は 1 / 2 / 3 のいずれか", () => {
    for (const f of ADVANCED_FIELDS) {
      expect([1, 2, 3]).toContain(f.tier)
    }
  })
})

describe("getFieldsForDb", () => {
  it("ALL_DB_VALUE の時は Tier 1 + Tier 2 のみ（Tier 3 なし）", () => {
    const fields = getFieldsForDb(ALL_DB_VALUE)
    for (const f of fields) {
      expect(f.tier).not.toBe(3)
    }
    expect(fields.length).toBe(8 + 2)
  })

  it("sra 指定で Tier 1 + Tier 2 + SRA/GEA Tier 3 が含まれる", () => {
    const fields = getFieldsForDb("sra")
    const ids = fields.map((f) => f.id)
    expect(ids).toContain("library_strategy")
    expect(ids).toContain("platform")
    expect(ids).not.toContain("project_type")
    expect(ids).not.toContain("rank")
  })

  it("bioproject 指定で project_type が利用可", () => {
    const ids = getFieldsForDb("bioproject").map((f) => f.id)
    expect(ids).toContain("project_type")
    expect(ids).toContain("bioproject_grant_agency")
    expect(ids).not.toContain("library_strategy")
  })

  it("taxonomy 指定で date 系は利用不可 / rank 等が利用可", () => {
    const ids = getFieldsForDb("taxonomy").map((f) => f.id)
    expect(ids).toContain("rank")
    expect(ids).toContain("species")
    expect(ids).not.toContain("date_published")
    expect(ids).not.toContain("organism")
  })

  it("metabobank は Tier 3 フィールドを持たない", () => {
    const fields = getFieldsForDb("metabobank")
    expect(fields.every((f) => f.tier !== 3)).toBe(true)
  })
})

describe("isFieldAvailableForDb", () => {
  it("横断モード (ALL_DB_VALUE) で Tier 3 は false", () => {
    expect(isFieldAvailableForDb("library_strategy", ALL_DB_VALUE)).toBe(false)
    expect(isFieldAvailableForDb("identifier", ALL_DB_VALUE)).toBe(true)
  })

  it("sra 指定で SRA Tier 3 のみ true", () => {
    expect(isFieldAvailableForDb("library_strategy", "sra")).toBe(true)
    expect(isFieldAvailableForDb("project_type", "sra")).toBe(false)
  })

  it("未知フィールドは常に false", () => {
    expect(isFieldAvailableForDb("__unknown__", "sra")).toBe(false)
    expect(isFieldAvailableForDb("__unknown__", ALL_DB_VALUE)).toBe(false)
  })

  it("PBT: 任意 fieldId と DbSelectValue に対して throw しない", () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.constantFrom(ALL_DB_VALUE, ...DB_ORDER),
        (id, db) => {
          expect(() => isFieldAvailableForDb(id, db)).not.toThrow()
        },
      ),
    )
  })
})

describe("isTier3 / findField", () => {
  it("isTier3 は Tier 3 のみ true", () => {
    expect(isTier3("library_strategy")).toBe(true)
    expect(isTier3("title")).toBe(false)
    expect(isTier3("submitter")).toBe(false)
    expect(isTier3("__unknown__")).toBe(false)
  })

  it("findField は未知 id で undefined", () => {
    expect(findField("__nope__")).toBeUndefined()
    expect(findField("title")?.tier).toBe(1)
  })

  it("fieldLabelKey は routes.advancedSearch.fields.{id}.label", () => {
    expect(fieldLabelKey("title")).toBe("routes.advancedSearch.fields.title.label")
    expect(fieldLabelKey("library_strategy")).toBe(
      "routes.advancedSearch.fields.library_strategy.label",
    )
  })
})

describe("Tier 3 拡張フィールド (BioSample 5 / SRA 3 / JGA 2 / BioProject 1)", () => {
  const expansion = [
    { id: "host", db: "biosample", type: "text" },
    { id: "strain", db: "biosample", type: "text" },
    { id: "isolate", db: "biosample", type: "text" },
    { id: "geo_loc_name", db: "biosample", type: "text" },
    { id: "collection_date", db: "biosample", type: "text" },
    { id: "analysis_type", db: "sra", type: "text" },
    { id: "library_name", db: "sra", type: "text" },
    { id: "library_construction_protocol", db: "sra", type: "text" },
    { id: "dataset_type", db: "jga", type: "text" },
    { id: "vendor", db: "jga", type: "text" },
    { id: "relevance", db: "bioproject", type: "enum" },
  ] as const

  it.each(expansion)("$id は Tier 3、type=$type、$db で利用可", ({ id, db, type }) => {
    const f = findField(id)
    expect(f).toBeDefined()
    expect(f?.tier).toBe(3)
    expect(f?.type).toBe(type)
    expect(isFieldAvailableForDb(id, db)).toBe(true)
    expect(isFieldAvailableForDb(id, ALL_DB_VALUE)).toBe(false)
  })

  it("geo_loc_name / collection_date は biosample と sra の両方で利用可", () => {
    for (const id of ["geo_loc_name", "collection_date"]) {
      const f = findField(id)
      expect([...(f?.availableDbs ?? [])].sort()).toEqual(["biosample", "sra"])
    }
  })

  it("relevance は enum 型かつ availableOps は equals / not_equals", () => {
    const f = findField("relevance")
    expect(f?.type).toBe("enum")
    expect([...(f?.availableOps ?? [])].sort()).toEqual(
      ["equals", "not_equals"].sort(),
    )
    expect(f?.enumValues).toEqual([])
  })

  it("disease / tissue / env_biome は API allowlist 未対応のため mock から削除済", () => {
    expect(findField("disease")).toBeUndefined()
    expect(findField("tissue")).toBeUndefined()
    expect(findField("env_biome")).toBeUndefined()
  })
})
