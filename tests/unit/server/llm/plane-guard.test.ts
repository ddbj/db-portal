import { describe, expect, test } from "vitest"

import { type AstNode, repairCrossPlane } from "../../../../server/llm/assistant/plane-guard"

// Mirror of the plane partition (docs/search-fields.md § subtype plane 不変量), used to
// assert the repaired AST is plane-safe (never ANDs fields from two SRA/JGA planes).
const SRA_SAMPLE = new Set(["organism_name", "organism_id", "geo_loc_name", "collection_date", "derived_from_id"])
const SRA_EXPERIMENT = new Set([
  "library_strategy", "library_source", "library_selection", "library_layout",
  "platform", "instrument_model", "library_name", "library_construction_protocol",
])

type Collected = { fields: { field: string; value?: string | undefined }[]; freeTexts: string[] }
const collect = (node: AstNode, acc: Collected = { fields: [], freeTexts: [] }): Collected => {
  if ("op" in node && node.op === "free_text") acc.freeTexts.push(node.value)
  else if ("field" in node) acc.fields.push({ field: node.field, value: "value" in node ? node.value : undefined })
  else if ("rules" in node) node.rules.forEach((c) => collect(c, acc))

  return acc
}

const sraPlanesPresent = (node: AstNode): Set<string> => {
  const planes = new Set<string>()
  for (const f of collect(node).fields) {
    if (f.field === "type" && f.value) planes.add(f.value.replace("sra-", ""))
    else if (SRA_SAMPLE.has(f.field)) planes.add("sample")
    else if (SRA_EXPERIMENT.has(f.field)) planes.add("experiment")
    else if (f.field === "analysis_type") planes.add("analysis")
  }

  return planes
}

const and = (...rules: AstNode[]): AstNode => ({ op: "AND", rules })
const eq = (field: string, value: string): AstNode => ({ field, op: "eq", value }) as AstNode
const contains = (field: string, value: string): AstNode => ({ field, op: "contains", value }) as AstNode
const ft = (value: string): AstNode => ({ op: "free_text", value, is_phrase: true }) as AstNode

describe("repairCrossPlane", () => {
  test("organismPlusLibraryAndPlatform_dropsExperimentAddsFreeText", () => {
    const ast = and(contains("organism_name", "Homo sapiens"), eq("library_strategy", "RNA-Seq"), eq("platform", "ILLUMINA"))
    const out = repairCrossPlane(ast, "sra")
    expect(out).not.toBeNull()
    const c = collect(out!)
    expect(c.fields.map((f) => f.field)).toEqual(["organism_name"])
    expect(c.freeTexts).toEqual(["RNA-seq"])
    expect(sraPlanesPresent(out!)).toEqual(new Set(["sample"]))
  })

  test("singleCellSource_mapsToSingleCellRnaSeqPhrase", () => {
    const ast = and(contains("organism_name", "Mus musculus"), eq("library_source", "TRANSCRIPTOMIC SINGLE CELL"), eq("library_strategy", "RNA-Seq"))
    const out = repairCrossPlane(ast, "sra")
    expect(collect(out!).freeTexts).toEqual(["single-cell RNA-seq"])
  })

  test("organismPlusLayoutOnly_dropsLayoutNoFreeTextSynthesised", () => {
    // library_layout is not a "primary concept", so nothing is folded back in.
    const ast = and(contains("organism_name", "Homo sapiens"), ft("exome"), eq("library_layout", "PAIRED"))
    const out = repairCrossPlane(ast, "sra")
    const c = collect(out!)
    expect(c.fields.map((f) => f.field)).toEqual(["organism_name"])
    expect(c.freeTexts).toEqual(["exome"]) // existing free-text kept, no duplicate added
    expect(sraPlanesPresent(out!)).toEqual(new Set(["sample"]))
  })

  test("negatedPlatform_isDropped", () => {
    const ast = and(contains("organism_name", "Oryza sativa"), ft("amplicon"), { op: "NOT", rules: [eq("platform", "ILLUMINA")] })
    const out = repairCrossPlane(ast, "sra")
    expect(sraPlanesPresent(out!)).toEqual(new Set(["sample"]))
    expect(collect(out!).freeTexts).toEqual(["amplicon"])
  })

  test("orSetOfStrategies_dropsWholeGroupKeepsOrganism", () => {
    const orGroup: AstNode = { op: "OR", rules: [eq("library_strategy", "Hi-C"), eq("library_strategy", "miRNA-Seq")] }
    const ast = and(contains("organism_name", "Gallus gallus"), orGroup)
    const out = repairCrossPlane(ast, "sra")
    const c = collect(out!)
    expect(c.fields.map((f) => f.field)).toEqual(["organism_name"])
    expect(sraPlanesPresent(out!)).toEqual(new Set(["sample"]))
  })

  test("typeSraSampleWithExperimentField_keepsSampleSubtype", () => {
    const ast = and(contains("description", "tuberculosis"), eq("library_source", "GENOMIC"), eq("type", "sra-sample"))
    const out = repairCrossPlane(ast, "sra")
    const c = collect(out!)
    expect(c.fields.map((f) => f.field).sort()).toEqual(["description", "type"])
    expect(c.freeTexts).toEqual(["genomic"])
  })

  test("jgaStudyTypeWithDatasetSubtype_dropsDatasetType", () => {
    const ast = and(contains("organism_name", "Homo sapiens"), eq("study_type", "Whole Genome Sequencing"), eq("type", "jga-dataset"))
    const out = repairCrossPlane(ast, "jga")
    const fields = collect(out!).fields.map((f) => f.field).sort()
    expect(fields).toEqual(["organism_name", "study_type"])
  })

  test("planeSafeQuery_returnsNull", () => {
    expect(repairCrossPlane(and(contains("organism_name", "Homo sapiens"), ft("RNA-seq")), "sra")).toBeNull()
    expect(repairCrossPlane(and(eq("library_strategy", "RNA-Seq"), eq("platform", "ILLUMINA")), "sra")).toBeNull()
  })

  test("crossDbScope_neverRepaired", () => {
    const ast = and(contains("organism_name", "Homo sapiens"), eq("library_strategy", "RNA-Seq"))
    expect(repairCrossPlane(ast, null)).toBeNull()
    expect(repairCrossPlane(ast, "biosample")).toBeNull()
  })
})
