import { describe, expect, it } from "vitest"

import {
  astToDsl,
  astToSidebarState,
  isParseBoolOp,
  isParseLeafRange,
  isParseLeafValue,
  type ParseAst,
  type ParseBoolOp,
  type ParseLeafRange,
  type ParseLeafValue,
} from "@/lib/sidebar-from-ast"

const eqLeaf = (field: string, value: string): ParseLeafValue => ({
  field,
  op: "eq",
  value,
})

const containsLeaf = (field: string, value: string): ParseLeafValue => ({
  field,
  op: "contains",
  value,
})

const wildcardLeaf = (field: string, value: string): ParseLeafValue => ({
  field,
  op: "wildcard",
  value,
})

const rangeLeaf = (
  field: string,
  from: string,
  to: string,
): ParseLeafRange => ({
  field,
  op: "between",
  from,
  to,
})

const andOp = (rules: readonly ParseAst[]): ParseBoolOp => ({
  op: "AND",
  rules: [...rules],
})

const orOp = (rules: readonly ParseAst[]): ParseBoolOp => ({
  op: "OR",
  rules: [...rules],
})

const notOp = (rule: ParseAst): ParseBoolOp => ({
  op: "NOT",
  rules: [rule],
})

describe("type guards", () => {
  it("isParseLeafValue は eq/contains/wildcard を判別", () => {
    expect(isParseLeafValue(eqLeaf("organism", "9606"))).toBe(true)
    expect(isParseLeafValue(containsLeaf("strain", "K12"))).toBe(true)
    expect(isParseLeafValue(wildcardLeaf("title", "tumor*"))).toBe(true)
    expect(isParseLeafValue(rangeLeaf("date_published", "2020-01-01", "2024-12-31"))).toBe(false)
    expect(isParseLeafValue(andOp([eqLeaf("organism", "9606")]))).toBe(false)
  })

  it("isParseLeafRange は between だけ", () => {
    expect(isParseLeafRange(rangeLeaf("date_published", "2020", "2024"))).toBe(true)
    expect(isParseLeafRange(eqLeaf("organism", "9606"))).toBe(false)
  })

  it("isParseBoolOp は AND/OR/NOT", () => {
    expect(isParseBoolOp(andOp([eqLeaf("a", "b")]))).toBe(true)
    expect(isParseBoolOp(orOp([eqLeaf("a", "b")]))).toBe(true)
    expect(isParseBoolOp(notOp(eqLeaf("a", "b")))).toBe(true)
    expect(isParseBoolOp(eqLeaf("a", "b"))).toBe(false)
  })
})

describe("astToDsl", () => {
  it("eq leaf → field equals value", () => {
    expect(astToDsl(eqLeaf("organism", "9606"))).toBe("organism equals 9606")
  })

  it("空白を含む value は quote される", () => {
    expect(astToDsl(eqLeaf("host", "Homo sapiens"))).toBe(
      "host equals \"Homo sapiens\"",
    )
  })

  it("contains leaf → field contains value", () => {
    expect(astToDsl(containsLeaf("strain", "K12"))).toBe("strain contains K12")
  })

  it("wildcard leaf → field wildcard value", () => {
    expect(astToDsl(wildcardLeaf("title", "tum*"))).toBe("title wildcard \"tum*\"")
  })

  it("range leaf → field between from and to", () => {
    expect(astToDsl(rangeLeaf("date_published", "2020-01-01", "2024-12-31"))).toBe(
      "date_published between \"2020-01-01\" and \"2024-12-31\"",
    )
  })

  it("AND group → (a) and (b)", () => {
    const dsl = astToDsl(
      andOp([eqLeaf("organism", "9606"), containsLeaf("strain", "K12")]),
    )
    expect(dsl).toBe("(organism equals 9606) and (strain contains K12)")
  })

  it("OR group → (a) or (b)", () => {
    const dsl = astToDsl(
      orOp([eqLeaf("host", "Homo sapiens"), eqLeaf("host", "Mus musculus")]),
    )
    expect(dsl).toBe(
      "(host equals \"Homo sapiens\") or (host equals \"Mus musculus\")",
    )
  })

  it("NOT group → not (child)", () => {
    expect(astToDsl(notOp(eqLeaf("organism", "9606")))).toBe(
      "not (organism equals 9606)",
    )
  })

  it("単一 child の AND は括弧 1 重", () => {
    expect(astToDsl(andOp([eqLeaf("organism", "9606")]))).toBe(
      "(organism equals 9606)",
    )
  })

  it("escape: backslash と double quote", () => {
    expect(astToDsl(eqLeaf("title", "say \"hi\""))).toBe(
      "title equals \"say \\\"hi\\\"\"",
    )
  })
})

describe("astToSidebarState (null/empty)", () => {
  it("null AST → EMPTY", () => {
    const r = astToSidebarState(null, "biosample")
    expect(r.sidebar.facets).toEqual({})
    expect(r.sidebar.keywords).toEqual({})
    expect(r.sidebar.dateRange).toBeNull()
    expect(r.sidebar.subtype).toBeNull()
    expect(r.residual).toBeNull()
  })
})

describe("astToSidebarState (single leaf)", () => {
  it("eq + facet 対応 field → sidebar.facets[field] = [value]", () => {
    const r = astToSidebarState(eqLeaf("organism", "9606"), "biosample")
    expect(r.sidebar.facets).toEqual({ organism: ["9606"] })
    expect(r.residual).toBeNull()
  })

  it("contains + keyword 対応 field → sidebar.keywords[field] = value", () => {
    const r = astToSidebarState(containsLeaf("strain", "K12"), "biosample")
    expect(r.sidebar.keywords).toEqual({ strain: "K12" })
    expect(r.residual).toBeNull()
  })

  it("between + date 軸 → sidebar.dateRange", () => {
    const r = astToSidebarState(
      rangeLeaf("date_published", "2020-01-01", "2024-12-31"),
      "biosample",
    )
    expect(r.sidebar.dateRange).toEqual({
      axis: "date_published",
      from: "2020-01-01",
      to: "2024-12-31",
    })
    expect(r.residual).toBeNull()
  })

  it("type field eq + subtype 対応 DB (sra) → sidebar.subtype", () => {
    const r = astToSidebarState(eqLeaf("type", "sra-experiment"), "sra")
    expect(r.sidebar.subtype).toBe("sra-experiment")
    expect(r.residual).toBeNull()
  })

  it("type field eq + subtype 非対応 DB (biosample) → residual", () => {
    const r = astToSidebarState(eqLeaf("type", "anything"), "biosample")
    expect(r.sidebar.subtype).toBeNull()
    expect(r.residual).toEqual(eqLeaf("type", "anything"))
  })

  it("sidebar 対応外 field の eq → residual", () => {
    const r = astToSidebarState(eqLeaf("title", "cancer"), "biosample")
    expect(r.sidebar.facets).toEqual({})
    expect(r.residual).toEqual(eqLeaf("title", "cancer"))
  })

  it("sidebar 対応外 field の contains → residual", () => {
    const r = astToSidebarState(containsLeaf("title", "cancer"), "biosample")
    expect(r.residual).toEqual(containsLeaf("title", "cancer"))
  })

  it("date 軸非対応 DB (taxonomy) → residual", () => {
    const r = astToSidebarState(
      rangeLeaf("date_published", "2020-01-01", "2024-12-31"),
      "taxonomy",
    )
    expect(r.sidebar.dateRange).toBeNull()
    expect(r.residual).not.toBeNull()
  })
})

describe("astToSidebarState (AND top-level)", () => {
  it("複数 children を 1 つずつ分類", () => {
    const ast = andOp([
      eqLeaf("organism", "9606"),
      containsLeaf("strain", "K12"),
      rangeLeaf("date_published", "2020-01-01", "2024-12-31"),
    ])
    const r = astToSidebarState(ast, "biosample")
    expect(r.sidebar.facets).toEqual({ organism: ["9606"] })
    expect(r.sidebar.keywords).toEqual({ strain: "K12" })
    expect(r.sidebar.dateRange).toEqual({
      axis: "date_published",
      from: "2020-01-01",
      to: "2024-12-31",
    })
    expect(r.residual).toBeNull()
  })

  it("混在: 一部 sidebar / 一部 residual → 後者は residual", () => {
    const ast = andOp([
      eqLeaf("organism", "9606"),
      eqLeaf("title", "cancer"),
    ])
    const r = astToSidebarState(ast, "biosample")
    expect(r.sidebar.facets).toEqual({ organism: ["9606"] })
    expect(r.residual).toEqual(eqLeaf("title", "cancer"))
  })

  it("residual が複数なら AND group", () => {
    const ast = andOp([
      eqLeaf("organism", "9606"),
      eqLeaf("title", "cancer"),
      eqLeaf("description", "lung"),
    ])
    const r = astToSidebarState(ast, "biosample")
    expect(r.sidebar.facets).toEqual({ organism: ["9606"] })
    expect(r.residual).toEqual(
      andOp([eqLeaf("title", "cancer"), eqLeaf("description", "lung")]),
    )
  })
})

describe("astToSidebarState (OR group)", () => {
  it("同 field 複数 eq の OR group → facet 複数値", () => {
    const ast = orOp([
      eqLeaf("organism", "9606"),
      eqLeaf("organism", "10090"),
    ])
    const r = astToSidebarState(ast, "biosample")
    expect(r.sidebar.facets).toEqual({ organism: ["9606", "10090"] })
    expect(r.residual).toBeNull()
  })

  it("異なる field の OR group → residual", () => {
    const ast = orOp([
      eqLeaf("organism", "9606"),
      eqLeaf("title", "cancer"),
    ])
    const r = astToSidebarState(ast, "biosample")
    expect(r.sidebar.facets).toEqual({})
    expect(r.residual).toEqual(ast)
  })

  it("type field の複数値 OR は単一選択 sidebar 不可 → residual", () => {
    const ast = orOp([
      eqLeaf("type", "sra-experiment"),
      eqLeaf("type", "sra-sample"),
    ])
    const r = astToSidebarState(ast, "sra")
    expect(r.sidebar.subtype).toBeNull()
    expect(r.residual).toEqual(ast)
  })
})

describe("astToSidebarState (subtype 連動 facet)", () => {
  it("type=sra-experiment + library_strategy → 両方 sidebar に取り込み", () => {
    const ast = andOp([
      eqLeaf("type", "sra-experiment"),
      eqLeaf("library_strategy", "WGS"),
    ])
    const r = astToSidebarState(ast, "sra")
    expect(r.sidebar.subtype).toBe("sra-experiment")
    expect(r.sidebar.facets).toEqual({ library_strategy: ["WGS"] })
    expect(r.residual).toBeNull()
  })

  it("subtype 未指定で library_strategy → residual (subtype 連動なので)", () => {
    const ast = eqLeaf("library_strategy", "WGS")
    const r = astToSidebarState(ast, "sra")
    expect(r.sidebar.facets).toEqual({})
    expect(r.residual).toEqual(ast)
  })

  it("type=sra-sample + geo_loc_name keyword", () => {
    const ast = andOp([
      eqLeaf("type", "sra-sample"),
      containsLeaf("geo_loc_name", "Japan"),
    ])
    const r = astToSidebarState(ast, "sra")
    expect(r.sidebar.subtype).toBe("sra-sample")
    expect(r.sidebar.keywords).toEqual({ geo_loc_name: "Japan" })
  })
})

describe("astToSidebarState (Trad/Taxonomy)", () => {
  it("Trad: feature_gene_name keyword → sidebar.keywords", () => {
    const ast = containsLeaf("feature_gene_name", "BRCA1")
    const r = astToSidebarState(ast, "trad")
    expect(r.sidebar.keywords).toEqual({ feature_gene_name: "BRCA1" })
  })

  it("Taxonomy: lineage keyword → sidebar.keywords", () => {
    const ast = containsLeaf("lineage", "Bacteria")
    const r = astToSidebarState(ast, "taxonomy")
    expect(r.sidebar.keywords).toEqual({ lineage: "Bacteria" })
  })
})
