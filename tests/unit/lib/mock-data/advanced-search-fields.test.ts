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

  it("enum 型フィールドは全て非空の enumValues を持つ", () => {
    const freeFormEnums = ADVANCED_FIELDS.filter(
      (f) => f.type === "enum" && (f.enumValues ?? []).length === 0,
    )
    expect(freeFormEnums.map((f) => f.id)).toEqual([])
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

  it("Tier 3 は全 8 DB（SRA、BioSample、BioProject、Trad、Taxonomy、JGA、GEA、MetaboBank）をカバー", () => {
    const tier3 = getFieldsForTier(3)
    const dbCoverage = new Set<string>()
    for (const f of tier3) {
      for (const db of f.availableDbs) dbCoverage.add(db)
    }
    expect(dbCoverage).toEqual(
      new Set(["sra", "biosample", "bioproject", "trad", "taxonomy", "jga", "gea", "metabobank"]),
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

  it("sra 指定で Tier 1 + Tier 2 + SRA Tier 3 が含まれる (GEA 専用 field は除外)", () => {
    const fields = getFieldsForDb("sra")
    const ids = fields.map((f) => f.id)
    expect(ids).toContain("library_strategy")
    expect(ids).toContain("platform")
    expect(ids).not.toContain("project_type")
    expect(ids).not.toContain("rank")
    expect(ids).not.toContain("gea_experiment_type")
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

  it("metabobank は Tier 3 フィールド (study_type / experiment_type / submission_type) を持つ", () => {
    const ids = getFieldsForDb("metabobank").map((f) => f.id)
    expect(ids).toContain("metabobank_study_type")
    expect(ids).toContain("metabobank_experiment_type")
    expect(ids).toContain("submission_type")
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

  it("relevance は enum 型、equals / not_equals、INSDC 7 値の enumValues を持つ", () => {
    const f = findField("relevance")
    expect(f?.type).toBe("enum")
    expect([...(f?.availableOps ?? [])].sort()).toEqual(
      ["equals", "not_equals"].sort(),
    )
    expect(f?.enumValues?.map((e) => e.value)).toEqual([
      "Agricultural",
      "Medical",
      "Industrial",
      "Environmental",
      "Evolution",
      "ModelOrganism",
      "Other",
    ])
  })

  it("project_type は enum 型、enumValues は ES objectType 値域 (BioProject / UmbrellaBioProject)", () => {
    const f = findField("project_type")
    expect(f?.type).toBe("enum")
    expect(f?.enumValues?.map((e) => e.value)).toEqual([
      "BioProject",
      "UmbrellaBioProject",
    ])
  })

  it("API allowlist 未対応 / 別 field 代替の field は mock から削除済", () => {
    expect(findField("disease")).toBeUndefined()
    expect(findField("tissue")).toBeUndefined()
    expect(findField("env_biome")).toBeUndefined()
    expect(findField("japanese_name")).toBeUndefined()
    expect(findField("principal_investigator")).toBeUndefined()
    expect(findField("submitting_organization")).toBeUndefined()
  })
})

describe("Tier 3 機能欠落補完 (GEA 1 / MetaboBank 3 / JGA rename / SRA 専用化)", () => {
  it("gea_experiment_type は GEA 専用、dslName は experiment_type", () => {
    const f = findField("gea_experiment_type")
    expect(f).toBeDefined()
    expect(f?.tier).toBe(3)
    expect(f?.type).toBe("text")
    expect(f?.dslName).toBe("experiment_type")
    expect(f?.availableDbs).toEqual(["gea"])
    expect(isFieldAvailableForDb("gea_experiment_type", "gea")).toBe(true)
    expect(isFieldAvailableForDb("gea_experiment_type", "sra")).toBe(false)
  })

  it("MetaboBank の metabobank_study_type / metabobank_experiment_type / submission_type は metabobank 専用", () => {
    const ids = ["metabobank_study_type", "metabobank_experiment_type", "submission_type"]
    for (const id of ids) {
      const f = findField(id)
      expect(f).toBeDefined()
      expect(f?.tier).toBe(3)
      expect(f?.type).toBe("text")
      expect(f?.availableDbs).toEqual(["metabobank"])
      expect(isFieldAvailableForDb(id, "metabobank")).toBe(true)
    }
    expect(findField("metabobank_study_type")?.dslName).toBe("study_type")
    expect(findField("metabobank_experiment_type")?.dslName).toBe("experiment_type")
    expect(findField("submission_type")?.dslName).toBe("submission_type")
  })

  it("jga_study_type は JGA 専用 (旧 id 'study_type' は削除済)、dslName は study_type、enumValues 4 値", () => {
    const f = findField("jga_study_type")
    expect(f).toBeDefined()
    expect(f?.tier).toBe(3)
    expect(f?.type).toBe("enum")
    expect(f?.dslName).toBe("study_type")
    expect(f?.availableDbs).toEqual(["jga"])
    expect(f?.enumValues?.length).toBe(4)
    expect(findField("study_type")).toBeUndefined()
  })

  it("library_strategy / library_source / library_layout / platform / instrument_model は SRA 専用 (GEA から除外済)", () => {
    const sraExperimentFields = [
      "library_strategy",
      "library_source",
      "library_layout",
      "platform",
      "instrument_model",
    ]
    for (const id of sraExperimentFields) {
      const f = findField(id)
      expect(f?.availableDbs).toEqual(["sra"])
      expect(isFieldAvailableForDb(id, "sra")).toBe(true)
      expect(isFieldAvailableForDb(id, "gea")).toBe(false)
    }
  })
})
