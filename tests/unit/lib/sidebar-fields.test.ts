import { describe, expect, it } from "vitest"

import {
  findFacetMappingByDsl,
  findFacetMappingByFacetKey,
  isDateAxisField,
  isKeywordField,
  SIDEBAR_FIELDS_BY_DB,
  sidebarFieldsForDb,
} from "@/lib/sidebar-fields"

describe("SIDEBAR_FIELDS_BY_DB", () => {
  it("8 DB すべての定義を含む", () => {
    expect(Object.keys(SIDEBAR_FIELDS_BY_DB).sort()).toEqual([
      "bioproject",
      "biosample",
      "gea",
      "jga",
      "metabobank",
      "sra",
      "taxonomy",
      "trad",
    ])
  })

  it("Solr proxy (trad/taxonomy) は facet を持たない", () => {
    expect(SIDEBAR_FIELDS_BY_DB.trad.facets).toEqual([])
    expect(SIDEBAR_FIELDS_BY_DB.taxonomy.facets).toEqual([])
  })

  it("Taxonomy は dateAxes を持たない", () => {
    expect(SIDEBAR_FIELDS_BY_DB.taxonomy.dateAxes).toEqual([])
  })

  it("ES backed 6 DB は全て date 3 軸対応", () => {
    const esBackedDbs = ["bioproject", "biosample", "sra", "jga", "gea", "metabobank"] as const
    for (const db of esBackedDbs) {
      expect(SIDEBAR_FIELDS_BY_DB[db].dateAxes).toEqual([
        "date_published",
        "date_modified",
        "date_created",
      ])
    }
  })

  it("SRA / JGA は subtype フラグ true、それ以外は false", () => {
    expect(SIDEBAR_FIELDS_BY_DB.sra.subtype).toBe(true)
    expect(SIDEBAR_FIELDS_BY_DB.jga.subtype).toBe(true)
    expect(SIDEBAR_FIELDS_BY_DB.bioproject.subtype).toBe(false)
    expect(SIDEBAR_FIELDS_BY_DB.biosample.subtype).toBe(false)
    expect(SIDEBAR_FIELDS_BY_DB.gea.subtype).toBe(false)
    expect(SIDEBAR_FIELDS_BY_DB.metabobank.subtype).toBe(false)
  })

  it("BioProject の facet には relevance / project_type / accessibility が含まれる", () => {
    const dslNames = SIDEBAR_FIELDS_BY_DB.bioproject.facets.map((f) => f.dslName)
    expect(dslNames).toContain("relevance")
    expect(dslNames).toContain("project_type")
    expect(dslNames).toContain("accessibility")
  })

  it("ES backed 6 DB は accessibility facet を持つ", () => {
    const esBackedDbs = ["bioproject", "biosample", "sra", "jga", "gea", "metabobank"] as const
    for (const db of esBackedDbs) {
      const dslNames = SIDEBAR_FIELDS_BY_DB[db].facets.map((f) => f.dslName)
      expect(dslNames).toContain("accessibility")
    }
  })

  it("BioSample の keyword に host / strain / isolate / geo_loc_name / collection_date が含まれる", () => {
    const dslNames = SIDEBAR_FIELDS_BY_DB.biosample.keywords.map((k) => k.dslName)
    expect(dslNames).toEqual(
      expect.arrayContaining([
        "host",
        "strain",
        "isolate",
        "geo_loc_name",
        "collection_date",
      ]),
    )
  })

  it("facet key (camelCase) と dslName (snake_case) が分離されている", () => {
    const sraExp = SIDEBAR_FIELDS_BY_DB.sra.subtypeAdditional?.["sra-experiment"]
    const lib = sraExp?.facets?.find((f) => f.dslName === "library_strategy")
    expect(lib).toBeDefined()
    expect(lib?.facetKey).toBe("libraryStrategy")
  })

  it("各 facet / keyword mapping は labelKey を持つ", () => {
    const sraExp = SIDEBAR_FIELDS_BY_DB.sra.subtypeAdditional?.["sra-experiment"]
    expect(sraExp?.facets?.every((f) => f.labelKey.length > 0)).toBe(true)
    expect(SIDEBAR_FIELDS_BY_DB.biosample.keywords.every((k) => k.labelKey.length > 0)).toBe(true)
  })
})

describe("sidebarFieldsForDb", () => {
  it("subtype 未指定なら base の field のみ", () => {
    const fields = sidebarFieldsForDb("sra", null)
    expect(fields.facets.map((f) => f.dslName)).toEqual(["organism", "accessibility"])
  })

  it("sra-experiment 指定で library 系 facet が追加される", () => {
    const fields = sidebarFieldsForDb("sra", "sra-experiment")
    const dsls = fields.facets.map((f) => f.dslName)
    expect(dsls).toEqual(
      expect.arrayContaining([
        "organism",
        "accessibility",
        "library_strategy",
        "library_source",
        "library_selection",
        "library_layout",
        "platform",
        "instrument_model",
      ]),
    )
    expect(fields.keywords.map((k) => k.dslName)).toEqual(
      expect.arrayContaining(["library_name", "library_construction_protocol"]),
    )
  })

  it("sra-sample 指定で keyword が追加される", () => {
    const fields = sidebarFieldsForDb("sra", "sra-sample")
    expect(fields.keywords.map((k) => k.dslName)).toEqual(
      expect.arrayContaining(["geo_loc_name", "collection_date"]),
    )
  })

  it("jga-dataset 指定で datasetType facet と vendor keyword が追加される", () => {
    const fields = sidebarFieldsForDb("jga", "jga-dataset")
    expect(fields.facets.map((f) => f.dslName)).toContain("dataset_type")
    expect(fields.keywords.map((k) => k.dslName)).toContain("vendor")
  })

  it("subtype を持たない DB に subtype 渡しても base のまま", () => {
    const fields = sidebarFieldsForDb("biosample", "anything")
    expect(fields).toEqual(SIDEBAR_FIELDS_BY_DB.biosample)
  })

  it("未知 subtype を渡しても base のまま", () => {
    const fields = sidebarFieldsForDb("sra", "sra-unknown")
    expect(fields).toEqual(SIDEBAR_FIELDS_BY_DB.sra)
  })
})

describe("findFacetMappingByDsl", () => {
  it("dslName で facet mapping を引ける (objectType ↔ project_type alias)", () => {
    const fields = sidebarFieldsForDb("bioproject", null)
    const m = findFacetMappingByDsl(fields, "project_type")
    expect(m?.facetKey).toBe("objectType")
  })

  it("該当なしは null", () => {
    const fields = sidebarFieldsForDb("biosample", null)
    expect(findFacetMappingByDsl(fields, "nonexistent")).toBeNull()
  })
})

describe("findFacetMappingByFacetKey", () => {
  it("facetKey で mapping を引ける", () => {
    const fields = sidebarFieldsForDb("sra", "sra-experiment")
    const m = findFacetMappingByFacetKey(fields, "libraryStrategy")
    expect(m?.dslName).toBe("library_strategy")
  })

  it("該当なしは null", () => {
    const fields = sidebarFieldsForDb("trad", null)
    expect(findFacetMappingByFacetKey(fields, "organism")).toBeNull()
  })
})

describe("isKeywordField", () => {
  it("keyword 一覧に含まれれば true", () => {
    const fields = sidebarFieldsForDb("biosample", null)
    expect(isKeywordField(fields, "host")).toBe(true)
    expect(isKeywordField(fields, "strain")).toBe(true)
  })

  it("keyword 一覧外は false", () => {
    const fields = sidebarFieldsForDb("biosample", null)
    expect(isKeywordField(fields, "organism")).toBe(false)
  })
})

describe("isDateAxisField", () => {
  it("DEFAULT_DATE_AXES なら true", () => {
    const fields = sidebarFieldsForDb("bioproject", null)
    expect(isDateAxisField(fields, "date_published")).toBe(true)
    expect(isDateAxisField(fields, "date_modified")).toBe(true)
    expect(isDateAxisField(fields, "date_created")).toBe(true)
  })

  it("dateAxes が空 (taxonomy) ならいかなる field でも false", () => {
    const fields = sidebarFieldsForDb("taxonomy", null)
    expect(isDateAxisField(fields, "date_published")).toBe(false)
  })
})
