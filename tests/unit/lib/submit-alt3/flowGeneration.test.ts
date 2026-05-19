// submit-alt3 generateFlowCard golden test
// SSOT:
// - docs/submit-alt3-flow-rules.md §8.2 (12 example)
// - docs/submit-alt3-data-model.md §4.6.0 (物理表示順序)
//
// 期待値は現在の PoC 実装出力に対する明示 assertion。
// SSOT 理想形と乖離する箇所 (例: 例 1 で BS が 2 個に分かれる) は handoff で追跡。

import { describe, expect, it } from "vitest"

import {
  example1ProkaryoteRawAssembly,
  example2HumanRestrictedVcf,
  example3MetagenomeMagChain,
  example4HostPathogenMix,
  example5PhenotypeOnly,
  example6MultiplexRun,
  example7HybridAssembly,
  example7HybridAssemblyLinked,
  example8VariationAggregate,
  example9HaplotypePhased,
  example10TpaWgsReassembly,
  example11MetabolomicsLcMs,
  example12ThirdPartyAnnotation,
} from "@/lib/submit-alt3/__fixtures__/flowRulesExamples"
import { generateFlowCard } from "@/lib/submit-alt3/flowGeneration"
import { submissionReducer } from "@/lib/submit-alt3/reducer"
import { createEmptySubmission } from "@/types/submit-alt3"

// 全 Step の id と service の組 (順序確認用)
const stepDescriptors = (steps: ReturnType<typeof generateFlowCard>["steps"]) =>
  steps.map((s) => ({ id: s.id, service: s.service }))

describe("generateFlowCard / 空 Submission", () => {
  it("fileEntries が空なら steps も globalWarnings も空", () => {
    const card = generateFlowCard(createEmptySubmission())
    expect(card.steps).toEqual([])
    expect(card.globalWarnings).toEqual([])
  })
})

describe("generateFlowCard / 未設定 cell の globalWarning", () => {
  it("organism / accessRestriction / dataForm のいずれかが未設定なら global:unset-cells", () => {
    let s = createEmptySubmission()
    s = submissionReducer(s, {
      type: "add-file",
      payload: {
        buttonType: "sequence-read",
        groupType: "single",
        members: [{ displayName: "x.fastq", role: "single" }],
        defaultDataForm: "raw",
      },
    })
    // organism / accessRestriction を意図的に未設定のまま
    const card = generateFlowCard(s)
    const ids = card.globalWarnings.map((w) => w.id)
    expect(ids).toContain("global:unset-cells")
  })

  it("全 cell が埋まると global:unset-cells は出ない", () => {
    const card = generateFlowCard(example1ProkaryoteRawAssembly())
    const ids = card.globalWarnings.map((w) => w.id)
    expect(ids).not.toContain("global:unset-cells")
  })
})

describe("generateFlowCard / 例 1 prokaryote raw + assembly (data-model §4.3.1 同 sample 関連付け)", () => {
  const card = generateFlowCard(example1ProkaryoteRawAssembly())

  it("Step 数 = 4 (BP + 共通 BS + DRA + MSS)", () => {
    expect(card.steps).toHaveLength(4)
  })

  it("物理表示順序が SERVICE_PHYSICAL_ORDER 準拠 (BP → BS → DRA → MSS)", () => {
    expect(stepDescriptors(card.steps)).toEqual([
      { id: "step-primary-bioproject-bp-1", service: "primary-bioproject" },
      { id: "step-biosample-bs-1", service: "biosample" },
      { id: "step-dra-bs-1", service: "dra" },
      { id: "step-mss-bs-1", service: "mss" },
    ])
  })

  it("Primary BP は Rule 1 で Genome Sequencing と推測 (assembly-form=wgs)", () => {
    const bp = card.steps.find(
      (s) => s.id === "step-primary-bioproject-bp-1",
    )
    expect(bp?.intraDbInputs.projectDataType).toBe("Genome Sequencing")
    expect(bp?.intraDbInputs.commonLineage).toBe("Bacteria")
    expect(bp?.upstreamStepIds).toEqual([])
    expect(bp?.issuedAccessionTypes).toEqual(["PRJDB#####"])
  })

  it("BioSample は共通 1 個 (sourceGroupIds に raw / assembly Group の両方を含む)", () => {
    const bsSteps = card.steps.filter((s) => s.service === "biosample")
    expect(bsSteps).toHaveLength(1)
    const bs = bsSteps[0]
    expect(bs?.id).toBe("step-biosample-bs-1")
    expect(bs?.intraDbInputs.package).toBe("microbe")
    expect(bs?.intraDbInputs.organismHint).toBe("prokaryote")
    expect(bs?.targetGroupIds).toEqual(["group-1", "group-2"])
    expect(bs?.upstreamStepIds).toEqual(["step-primary-bioproject-bp-1"])
  })

  it("DRA Run は raw Group (group-1) に紐づき、共通 BS=bs-1 が upstream", () => {
    const dra = card.steps.find((s) => s.id === "step-dra-bs-1")
    expect(dra?.targetGroupIds).toEqual(["group-1"])
    expect(dra?.targetFileIds).toEqual(["file-1", "file-2"])
    expect(dra?.intraDbInputs.analysisKind).toBe("Run")
    expect(dra?.upstreamStepIds).toEqual([
      "step-primary-bioproject-bp-1",
      "step-biosample-bs-1",
    ])
  })

  it("MSS は assembly Group (group-2) + 共通 BS=bs-1 (関連付け後)、Rule 13 で BCT/WGS/wgs", () => {
    const mss = card.steps.find((s) => s.id === "step-mss-bs-1")
    expect(mss?.targetGroupIds).toEqual(["group-2"])
    expect(mss?.intraDbInputs.division).toBe("BCT")
    expect(mss?.intraDbInputs.dataType).toBe("WGS")
    expect(mss?.intraDbInputs.assemblyForm).toBe("wgs")
    expect(mss?.upstreamStepIds).toEqual([
      "step-primary-bioproject-bp-1",
      "step-biosample-bs-1",
    ])
  })

  it("Rule 14 warning: chip=wgs と MSS dataType=WGS は整合 → warning なし", () => {
    for (const step of card.steps) {
      expect(step.warnings).toEqual([])
    }
    expect(card.globalWarnings).toEqual([])
  })
})

describe("generateFlowCard / 例 2 human restricted + per-sample VCF (JGA 集約)", () => {
  const card = generateFlowCard(example2HumanRestrictedVcf())

  it("Step 数 = 3 (DBCLS + JGA 単一 + humandbs)", () => {
    expect(card.steps).toHaveLength(3)
  })

  it("物理表示順序: DBCLS → jga → humandbs", () => {
    expect(stepDescriptors(card.steps)).toEqual([
      { id: "step-dbcls-application", service: "dbcls-application" },
      { id: "step-jga", service: "jga" },
      { id: "step-humandbs", service: "humandbs" },
    ])
  })

  it("Primary BP / 非 JGA BioSample は出ない (Rule 6 集約発火)", () => {
    expect(card.steps.find((s) => s.service === "primary-bioproject")).toBeUndefined()
    expect(card.steps.find((s) => s.service === "biosample")).toBeUndefined()
  })

  it("DBCLS Step に DBCLS 提供申請 URL が intraDbInputs.url で乗る (Rule 12 enrich、linkLabel は i18n key)", () => {
    const dbcls = card.steps.find((s) => s.id === "step-dbcls-application")!
    expect(dbcls.badgeKind).toBe("external")
    expect(dbcls.intraDbInputs.url).toBe(
      "https://humandbs.ddbj.nig.ac.jp/nbdc/application/",
    )
    expect(dbcls.intraDbInputs.linkLabel).toBe(
      "routes.submitAlt3.flowSteps.dbcls-application.serviceLink",
    )
  })

  it("JGA Step は notes-only (intraDbInputs={}、8 オブジェクトの prep notes + raw/analysis 用 notes が乗る)", () => {
    const jga = card.steps.find((s) => s.id === "step-jga")!
    expect(jga.intraDbInputs).toEqual({})
    expect(jga.badgeKind).toBe("internal")
    expect(jga.upstreamStepIds).toEqual(["step-dbcls-application"])
    // 全 jgaPrep ノート + raw (experiment/data) + analysis (Rule 6b)
    for (const key of [
      "overview",
      "submission",
      "study",
      "sample",
      "experiment",
      "data",
      "analysis",
      "dataset",
      "policy",
    ]) {
      expect(jga.notes, `jgaPrep.${key} が乗る`).toContain(
        `routes.submitAlt3.flowGen.rule06.jgaPrep.${key}`,
      )
    }
    expect(jga.notes).toContain("routes.submitAlt3.flowGen.rule06b.analysisNotes")
    // phenotype-only でないので phenotype-only ノートは乗らない
    expect(jga.notes).not.toContain(
      "routes.submitAlt3.flowGen.rule06c.phenotypeOnlyDataset",
    )
  })

  it("JGA Step は raw + per-sample VCF 行を全て target", () => {
    const jga = card.steps.find((s) => s.id === "step-jga")!
    expect(jga.targetFileIds).toEqual(["file-1", "file-2", "file-3"])
  })

  it("JGA Step は 8 prefix の発行 accession を表示する", () => {
    const jga = card.steps.find((s) => s.id === "step-jga")!
    expect(jga.issuedAccessionTypes).toEqual([
      "JGA######",
      "JGAS######",
      "JGAN#########",
      "JGAX#########",
      "JGAR#########",
      "JGAZ#########",
      "JGAD######",
      "JGAP######",
    ])
  })

  it("humandbs Step は jga を upstream に持ち external URL を持つ", () => {
    const hd = card.steps.find((s) => s.id === "step-humandbs")!
    expect(hd.upstreamStepIds).toEqual(["step-jga"])
    expect(hd.intraDbInputs.url).toBe("https://humandbs.dbcls.jp/")
  })
})

describe("generateFlowCard / 例 3 metagenome MAG chain (Rule 8)", () => {
  const card = generateFlowCard(example3MetagenomeMagChain())

  it("Step 数 = 6 (BP + BS + 派生 BS + DRA Analysis (binned) + DRA Run (raw) + MSS (MAG))", () => {
    expect(card.steps).toHaveLength(6)
  })

  it("物理表示順序: BP → BS → 派生 BS → DRA (binned, raw) → MSS", () => {
    expect(stepDescriptors(card.steps)).toEqual([
      { id: "step-primary-bioproject-bp-1", service: "primary-bioproject" },
      { id: "step-biosample-bs-1", service: "biosample" },
      { id: "step-biosample-group-1-derived", service: "biosample" },
      { id: "step-dra-group-1-binned", service: "dra" },
      { id: "step-dra-group-1-raw", service: "dra" },
      { id: "step-mss-group-1-derived", service: "mss" },
    ])
  })

  it("元 BS の package は mims-me (metagenome default)", () => {
    const bs = card.steps.find((s) => s.id === "step-biosample-bs-1")!
    expect(bs.intraDbInputs.package).toBe("mims-me")
  })

  it("派生 BS の package は mimag、derivedFromBsIds に bs-1 を持つ", () => {
    const derived = card.steps.find((s) => s.id === "step-biosample-group-1-derived")!
    expect(derived.intraDbInputs.package).toBe("mimag")
    expect(derived.intraDbInputs.derivedFromBsIds).toEqual(["bs-1"])
    expect(derived.upstreamStepIds).toEqual(["step-biosample-bs-1"])
  })

  it("DRA Analysis (binned) は派生 BS を upstream、analysisType=Sequence Annotation", () => {
    const binned = card.steps.find((s) => s.id === "step-dra-group-1-binned")!
    expect(binned.intraDbInputs.analysisKind).toBe("Analysis")
    expect(binned.intraDbInputs.analysisType).toBe("Sequence Annotation")
    expect(binned.intraDbInputs.magSagStage).toBe("binned")
    expect(binned.upstreamStepIds).toEqual([
      "step-primary-bioproject-bp-1",
      "step-biosample-group-1-derived",
    ])
  })

  it("DRA Run (raw) は元 BS を upstream", () => {
    const raw = card.steps.find((s) => s.id === "step-dra-group-1-raw")!
    expect(raw.intraDbInputs.analysisKind).toBe("Run")
    expect(raw.intraDbInputs.magSagStage).toBe("raw")
    expect(raw.upstreamStepIds).toEqual([
      "step-primary-bioproject-bp-1",
      "step-biosample-bs-1",
    ])
  })

  it("MSS は dataType=MAG, division=ENV (Rule 13 assembly-form=mag override)", () => {
    const mss = card.steps.find((s) => s.id === "step-mss-group-1-derived")!
    expect(mss.intraDbInputs.dataType).toBe("MAG")
    expect(mss.intraDbInputs.division).toBe("ENV")
    expect(mss.intraDbInputs.assemblyForm).toBe("mag")
    expect(mss.upstreamStepIds).toEqual([
      "step-primary-bioproject-bp-1",
      "step-biosample-group-1-derived",
    ])
  })
})

describe("generateFlowCard / 例 4 host-pathogen 混合 (Rule 5 / Rule 6)", () => {
  const card = generateFlowCard(example4HostPathogenMix())

  it("Step 数 = 7 (DBCLS + pathogen 系 4 (BS merge 後) + JGA 単一 + humandbs)", () => {
    // pathogen BS が 2 → merge により 1 Step (segments=2)
    // JGA は 8 オブジェクトを単一 Step に集約
    expect(card.steps).toHaveLength(7)
  })

  it("Pathogen 系 (BP + BS(merged segments=2) + DRA + MSS) と JGA + humandbs が両立する", () => {
    const services = card.steps.map((s) => s.service)
    expect(services.filter((s) => s === "primary-bioproject")).toHaveLength(1)
    expect(services.filter((s) => s === "biosample")).toHaveLength(1)
    expect(services.filter((s) => s === "dra")).toHaveLength(1)
    expect(services.filter((s) => s === "mss")).toHaveLength(1)
    expect(services.filter((s) => s === "jga")).toHaveLength(1)
    const pathogenBs = card.steps.find(
      (s) => s.service === "biosample",
    )!
    expect(pathogenBs.segments?.map((seg) => seg.segmentId)).toEqual([
      "step-biosample-bs-2",
      "step-biosample-bs-3",
    ])
  })

  it("Umbrella BP は出ない (open 集合内で organism は prokaryote 1 系統のみ → assignments.length=1)", () => {
    expect(card.steps.find((s) => s.service === "umbrella-bioproject")).toBeUndefined()
  })

  it("Pathogen Primary BP は host の JGA 集約対象 file を含まない", () => {
    const bp = card.steps.find((s) => s.id === "step-primary-bioproject-bp-1")!
    expect(bp.targetGroupIds).toEqual(["group-2", "group-3"])
    expect(bp.targetFileIds).toEqual(["file-3", "file-4", "file-5"])
    expect(bp.intraDbInputs.commonLineage).toBe("Bacteria")
  })

  it("JGA Step は host 行を target に含む (per-individual の Sample 内訳は JGA システム側で記入)", () => {
    const jga = card.steps.find((s) => s.service === "jga")!
    expect(jga.id).toBe("step-jga")
    expect(jga.targetFileIds).toEqual(["file-1", "file-2"])
  })
})

describe("generateFlowCard / 例 5 phenotype-only (Rule 6c)", () => {
  const card = generateFlowCard(example5PhenotypeOnly())

  it("Step 数 = 3 (DBCLS + JGA 単一 + humandbs)", () => {
    expect(card.steps).toHaveLength(3)
  })

  it("JGA Step の notes に experiment/data/analysis prep は出ず、phenotype-only ノートが乗る", () => {
    const jga = card.steps.find((s) => s.id === "step-jga")!
    expect(jga.notes).not.toContain(
      "routes.submitAlt3.flowGen.rule06.jgaPrep.experiment",
    )
    expect(jga.notes).not.toContain(
      "routes.submitAlt3.flowGen.rule06.jgaPrep.data",
    )
    expect(jga.notes).not.toContain(
      "routes.submitAlt3.flowGen.rule06.jgaPrep.analysis",
    )
    expect(jga.notes).toContain(
      "routes.submitAlt3.flowGen.rule06c.phenotypeOnlyDataset",
    )
  })

  it("JGA Step に Rule 10c notes (Curator/DBCLS 相談 + URL) が乗る", () => {
    const jga = card.steps.find((s) => s.id === "step-jga")!
    expect(jga.notes).toContain("routes.submitAlt3.flowGen.rule10c.jgaSampleNotes")
    expect(jga.notes).toContain("https://www.ddbj.nig.ac.jp/contact-ddbj-e.html")
  })
})

describe("generateFlowCard / 例 6 multiplex (Rule 9)", () => {
  const card = generateFlowCard(example6MultiplexRun())

  it("Step 数 = 5 (BP + BS + DRA Run × 3 per-sample)", () => {
    expect(card.steps).toHaveLength(5)
  })

  it("per-sample DRA Run は file id discriminator", () => {
    const draIds = card.steps
      .filter((s) => s.service === "dra")
      .map((s) => s.id)
    expect(draIds).toEqual(["step-dra-file-1", "step-dra-file-2", "step-dra-file-3"])
  })

  it("各 multiplex DRA Run は targetFileIds=1、multiplexMember=true", () => {
    const draSteps = card.steps.filter((s) => s.service === "dra")
    for (const dra of draSteps) {
      expect(dra.targetFileIds).toHaveLength(1)
      expect(dra.intraDbInputs.multiplexMember).toBe(true)
      expect(dra.notes).toContain("routes.submitAlt3.flowGen.rule09.barcodeProtocol")
    }
  })

  it("BS は Group 単位 1 個 (Phase A の単一 BS 仕様)", () => {
    const bsSteps = card.steps.filter((s) => s.service === "biosample")
    expect(bsSteps).toHaveLength(1)
    expect(bsSteps[0]!.id).toBe("step-biosample-bs-1")
  })
})

describe("generateFlowCard / 例 7 hybrid (短 + 長 + 組み立て)", () => {
  // Phase A reducer には hybrid メタ Group を直接組む手段がないため、
  // 3 個独立 Group としての PoC 出力を golden として固定。
  const card = generateFlowCard(example7HybridAssembly())

  it("Step 数 = 4 (BP + BS(merged segments=3) + DRA(merged segments=2) + MSS)", () => {
    // 3 独立 Group → BS/DRA が Service 単位 merge で 1 Step に集約。BP と MSS は元から 1 件。
    expect(card.steps).toHaveLength(4)
  })

  it("hybrid メタ Group が無いため Rule 15 globalWarning は出ない", () => {
    expect(card.globalWarnings).toEqual([])
  })

  it("Primary BP は 3 Group を統合 (assembly-form=wgs の wgs-target → Genome Sequencing)", () => {
    const bp = card.steps.find((s) => s.id === "step-primary-bioproject-bp-1")!
    expect(bp.targetGroupIds).toEqual(["group-1", "group-2", "group-3"])
    expect(bp.intraDbInputs.projectDataType).toBe("Genome Sequencing")
  })

  it("DRA Run は merge 後 1 Step、segments=2 (短鎖 step-dra-bs-1、長鎖 step-dra-bs-2)", () => {
    const draSteps = card.steps.filter((s) => s.service === "dra")
    expect(draSteps).toHaveLength(1)
    expect(draSteps[0]!.segments?.map((seg) => seg.segmentId)).toEqual([
      "step-dra-bs-1",
      "step-dra-bs-2",
    ])
  })
})

describe("generateFlowCard / 例 7-linked hybrid (短 + 長 + 組み立て、同 sample 関連付け)", () => {
  // 短鎖 raw + 長鎖 raw + 組み立て fasta を同 sample (bs-1) に関連付け、
  // BP + BS + DRA(merged) + MSS = 4 Step に集約される (Service 単位 merge)。
  const card = generateFlowCard(example7HybridAssemblyLinked())

  it("Step 数 = 4 (BP + BS + DRA(merged segments=2) + MSS)", () => {
    expect(card.steps).toHaveLength(4)
  })

  it("BS は 1 個 (sourceGroupIds=[group-1, group-2, group-3])", () => {
    const bsSteps = card.steps.filter((s) => s.service === "biosample")
    expect(bsSteps).toHaveLength(1)
    expect(bsSteps[0]?.id).toBe("step-biosample-bs-1")
    expect(bsSteps[0]?.targetGroupIds).toEqual(["group-1", "group-2", "group-3"])
  })

  it("DRA Run は merge 後 1 Step、segments=2 (rule04 が同 discriminator=bs-1 で 2 件生成し merge で集約)", () => {
    const draSteps = card.steps.filter((s) => s.service === "dra")
    expect(draSteps).toHaveLength(1)
    expect(draSteps[0]!.id).toBe("step-dra-bs-1")
    expect(draSteps[0]!.segments).toHaveLength(2)
  })

  it("MSS は assembly Group (group-3) + bs-1、Rule 13 で BCT/WGS/wgs", () => {
    const mss = card.steps.find((s) => s.service === "mss")
    expect(mss?.id).toBe("step-mss-bs-1")
    expect(mss?.targetGroupIds).toEqual(["group-3"])
    expect(mss?.intraDbInputs.division).toBe("BCT")
    expect(mss?.intraDbInputs.dataType).toBe("WGS")
    expect(mss?.intraDbInputs.assemblyForm).toBe("wgs")
  })
})

describe("generateFlowCard / 例 8 variation aggregate (TogoVar)", () => {
  const card = generateFlowCard(example8VariationAggregate())

  it("Step 数 = 3 (BP + BS + TogoVar)", () => {
    expect(card.steps).toHaveLength(3)
  })

  it("Primary BP は Variation データタイプ (Rule 1 優先順序 1)", () => {
    const bp = card.steps.find((s) => s.service === "primary-bioproject")!
    expect(bp.intraDbInputs.projectDataType).toBe("Variation")
    expect(bp.intraDbInputs.commonLineage).toBe("Mammalia")
  })

  it("TogoVar Step は studyType=snp (snp-indel → snp)、issuedAccessionTypes=dstd###", () => {
    const tv = card.steps.find((s) => s.id === "step-togovar")!
    expect(tv.intraDbInputs.studyType).toBe("snp")
    expect(tv.issuedAccessionTypes).toEqual(["dstd###"])
    expect(tv.upstreamStepIds).toEqual([
      "step-primary-bioproject-bp-1",
      "step-biosample-bs-1",
    ])
  })

  it("BS package は human", () => {
    const bs = card.steps.find((s) => s.service === "biosample")!
    expect(bs.intraDbInputs.package).toBe("human")
  })
})

describe("generateFlowCard / 例 9 Haplotype phased (Rule 11)", () => {
  const card = generateFlowCard(example9HaplotypePhased())

  it("Step 数 = 8 (Umbrella + Principal/Alternate/DRA-shared BP + 共通 BS + DRA + MSS×2)", () => {
    expect(card.steps).toHaveLength(8)
  })

  it("biosample は rule11 が emit する 1 個のみ (rule03 が haplotypeMode で skip)", () => {
    const bs = card.steps.filter((s) => s.service === "biosample")
    expect(bs).toHaveLength(1)
    expect(bs[0]?.id).toBe("step-biosample-bs-1")
  })

  it("Umbrella BP + Principal/Alternate/DRA-shared BP + BS Step + DRA + MSS×2 を含む", () => {
    const services = card.steps.map((s) => s.service)
    expect(services.filter((s) => s === "umbrella-bioproject")).toHaveLength(1)
    expect(services.filter((s) => s === "primary-bioproject")).toHaveLength(3)
    expect(services.filter((s) => s === "dra")).toHaveLength(1)
    expect(services.filter((s) => s === "mss")).toHaveLength(2)
  })

  it("Umbrella BP の intraDbInputs.haplotypeMode=true", () => {
    const umbrella = card.steps.find((s) => s.service === "umbrella-bioproject")!
    expect(umbrella.id).toBe("step-umbrella-bioproject")
    expect(umbrella.intraDbInputs.haplotypeMode).toBe(true)
  })

  it("Principal / Alternate / DRA-shared BP の id 命名規約", () => {
    const bpIds = card.steps
      .filter((s) => s.service === "primary-bioproject")
      .map((s) => s.id)
      .sort()
    expect(bpIds).toEqual([
      "step-primary-bioproject-bp-alternate",
      "step-primary-bioproject-bp-dra-shared",
      "step-primary-bioproject-bp-principal",
    ])
  })

  it("各 Primary BP は Umbrella を upstream に持つ", () => {
    for (const bp of card.steps.filter((s) => s.service === "primary-bioproject")) {
      expect(bp.upstreamStepIds).toEqual(["step-umbrella-bioproject"])
    }
  })

  it("MSS (Principal / Alternate) は stComment に Diploid :: Principal/Alternate haplotype", () => {
    const principal = card.steps.find((s) => s.id === "step-mss-bp-principal")!
    expect(principal.intraDbInputs.stComment).toBe(
      "Diploid :: Principal haplotype",
    )
    expect(principal.intraDbInputs.haplotypePhase).toBe("principal")
    const alternate = card.steps.find((s) => s.id === "step-mss-bp-alternate")!
    expect(alternate.intraDbInputs.stComment).toBe(
      "Diploid :: Alternate haplotype",
    )
    expect(alternate.intraDbInputs.haplotypePhase).toBe("alternate")
  })

  it("Rule 13 で MSS の division=MAM、dataType=WGS、assemblyForm=wgs が乗る", () => {
    for (const mss of card.steps.filter((s) => s.service === "mss")) {
      expect(mss.intraDbInputs.division).toBe("MAM")
      expect(mss.intraDbInputs.dataType).toBe("WGS")
      expect(mss.intraDbInputs.assemblyForm).toBe("wgs")
    }
  })
})

describe("generateFlowCard / 例 10 TPA-WGS 再アセンブル (Rule 7a)", () => {
  const card = generateFlowCard(example10TpaWgsReassembly())

  it("Step 数 = 3 (BP + BS + TPA MSS)", () => {
    expect(card.steps).toHaveLength(3)
  })

  it("MSS Step に TPA prefix / KEYWORDS / referenceMeta が乗る (Rule 7a)", () => {
    const mss = card.steps.find((s) => s.id === "step-mss-bs-1")!
    expect(mss.intraDbInputs.thirdParty).toBe(true)
    expect(mss.intraDbInputs.tpaSubtype).toBe("tpa-assembly")
    expect(mss.intraDbInputs.definitionPrefix).toBe("TPA_asm:")
    expect(mss.intraDbInputs.keywords).toBe(
      "Third Party Data; TPA; TPA:assembly.",
    )
    expect(mss.intraDbInputs.citedAccessions).toEqual(["SRR12345678"])
    expect(mss.intraDbInputs.pubmedId).toBe("38123456")
  })

  it("Rule 13 で division=BCT, dataType=WGS, assemblyForm=wgs が後付けされる", () => {
    const mss = card.steps.find((s) => s.id === "step-mss-bs-1")!
    expect(mss.intraDbInputs.division).toBe("BCT")
    expect(mss.intraDbInputs.dataType).toBe("WGS")
    expect(mss.intraDbInputs.assemblyForm).toBe("wgs")
  })

  it("notes に locus_tag_prefix + DDBJ contact URL が含まれる", () => {
    const mss = card.steps.find((s) => s.id === "step-mss-bs-1")!
    expect(mss.notes).toContain("routes.submitAlt3.flowGen.rule07a.tpaPrimaryRequired")
    expect(mss.notes).toContain("routes.submitAlt3.flowGen.rule07a.locusTagPrefix")
    expect(mss.notes).toContain("https://www.ddbj.nig.ac.jp/contact-ddbj-e.html")
  })
})

describe("generateFlowCard / 例 11 metabolomics LC-MS (Rule 4c)", () => {
  const card = generateFlowCard(example11MetabolomicsLcMs())

  it("Step 数 = 3 (BP + BS + MetaboBank)", () => {
    expect(card.steps).toHaveLength(3)
  })

  it("Primary BP は Other (Rule 1 優先順序 3 mass-spec + metabolomics)", () => {
    const bp = card.steps.find((s) => s.service === "primary-bioproject")!
    expect(bp.intraDbInputs.projectDataType).toBe("Other")
  })

  it("MetaboBank Step は submissionType=LC-MS、Study only note", () => {
    const mb = card.steps.find((s) => s.id === "step-metabobank")!
    expect(mb.intraDbInputs.submissionType).toBe("LC-MS")
    expect(mb.issuedAccessionTypes).toEqual(["MTBKSn"])
    expect(mb.notes).toContain("routes.submitAlt3.flowGen.rule04c.studyOnly")
  })
})

describe("generateFlowCard / 例 12 third-party annotation (Rule 7c notes-only)", () => {
  const card = generateFlowCard(example12ThirdPartyAnnotation())

  it("Step 数 = 3 (BP + BS + notes-only MSS)", () => {
    expect(card.steps).toHaveLength(3)
  })

  it("MSS Step は annotationOnly=true + curatorReviewRequired=true で Submit 不可", () => {
    const mss = card.steps.find((s) => s.id === "step-mss-bs-1")!
    expect(mss.intraDbInputs.thirdParty).toBe(true)
    expect(mss.intraDbInputs.annotationOnly).toBe(true)
    expect(mss.intraDbInputs.curatorReviewRequired).toBe(true)
  })

  it("Rule 7c の warning (curator-required) が乗る", () => {
    const mss = card.steps.find((s) => s.id === "step-mss-bs-1")!
    const curatorWarning = mss.warnings.find(
      (w) => w.id === "step-mss-bs-1:warning:curator-required",
    )
    expect(curatorWarning).toBeDefined()
    expect(curatorWarning!.severity).toBe("warning")
    expect(curatorWarning!.messageKey).toBe(
      "routes.submitAlt3.flowGen.rule07c.warning.curatorRequired",
    )
  })

  it("curator-required warning は acknowledged=false (未 dismiss)", () => {
    const mss = card.steps.find((s) => s.id === "step-mss-bs-1")!
    const curatorWarning = mss.warnings.find(
      (w) => w.id === "step-mss-bs-1:warning:curator-required",
    )!
    expect(curatorWarning.acknowledged).toBe(false)
  })
})

// ----- バグ探し系 (CLAUDE.md「通るだけのテスト」回避) -----

describe("generateFlowCard / 純粋関数性 + warning dedupe", () => {
  it("同じ Submission に対して 2 回呼んで結果は deep equal (純粋関数)", () => {
    const submission = example1ProkaryoteRawAssembly()
    const a = generateFlowCard(submission)
    const b = generateFlowCard(submission)
    expect(a).toEqual(b)
  })

  it("dedupeWarnings が globalWarnings 内の重複 id を除去する", () => {
    // unset-cells を出すために空 dataForm の cell を持つ submission を作る
    let s = createEmptySubmission()
    s = submissionReducer(s, {
      type: "add-file",
      payload: {
        buttonType: "sequence-read",
        groupType: "single",
        members: [{ displayName: "x.fastq", role: "single" }],
        defaultDataForm: "raw",
      },
    })
    // organism を未設定にする (dataForm は raw、accessRestriction は未設定)
    const card = generateFlowCard(s)
    const ids = card.globalWarnings.map((w) => w.id)
    const unique = new Set(ids)
    expect(ids.length).toBe(unique.size)
  })
})

describe("generateFlowCard / dismissedWarnings の acknowledged 反映", () => {
  it("dismissedWarnings に warning id を入れると Rule 7c warning が acknowledged=true で出る", () => {
    let s = example12ThirdPartyAnnotation()
    const warningId = "step-mss-bs-1:warning:curator-required"
    s = submissionReducer(s, {
      type: "dismiss-warning",
      payload: { warningId },
    })
    const card = generateFlowCard(s)
    const mss = card.steps.find((s2) => s2.id === "step-mss-bs-1")!
    const w = mss.warnings.find((w2) => w2.id === warningId)!
    expect(w.acknowledged).toBe(true)
  })

  it("dismissedWarnings に存在しない id は acknowledged=false のまま", () => {
    let s = example12ThirdPartyAnnotation()
    s = submissionReducer(s, {
      type: "dismiss-warning",
      payload: { warningId: "non-existent-warning-id" },
    })
    const card = generateFlowCard(s)
    const mss = card.steps.find((s2) => s2.id === "step-mss-bs-1")!
    const w = mss.warnings.find(
      (w2) => w2.id === "step-mss-bs-1:warning:curator-required",
    )!
    expect(w.acknowledged).toBe(false)
  })

  it("restore-warning で dismissed が消えると acknowledged=false に戻る", () => {
    let s = example12ThirdPartyAnnotation()
    const warningId = "step-mss-bs-1:warning:curator-required"
    s = submissionReducer(s, { type: "dismiss-warning", payload: { warningId } })
    s = submissionReducer(s, { type: "restore-warning", payload: { warningId } })
    const card = generateFlowCard(s)
    const mss = card.steps.find((s2) => s2.id === "step-mss-bs-1")!
    const w = mss.warnings.find((w2) => w2.id === warningId)!
    expect(w.acknowledged).toBe(false)
  })
})

describe("generateFlowCard / Rule 13 chip 変化 → division override 連動", () => {
  it("例 1 の chip を assembly-form=mag に書き換えると MSS の division=ENV にスイッチ", () => {
    let s = example1ProkaryoteRawAssembly()
    const assemblyFile = s.fileEntries.find((f) => f.displayName === "assembly.fa")!
    s = submissionReducer(s, {
      type: "set-chip",
      payload: { fileId: assemblyFile.id, axis: "assembly-form", value: "mag" },
    })
    const card = generateFlowCard(s)
    const mss = card.steps.find((s2) => s2.service === "mss")!
    expect(mss.intraDbInputs.assemblyForm).toBe("mag")
    expect(mss.intraDbInputs.dataType).toBe("MAG")
    expect(mss.intraDbInputs.division).toBe("ENV")
  })

  it("例 1 で chip 変化に伴い Rule 14 warning が新規に発生する (MAG vs assembly-form 不整合の case ではない)", () => {
    // mag は MSS_DATATYPE_CONSISTENCY の MAG/SAG rule で expectedAssemblyForm=["mag", "sag"]
    // → assembly-form=mag は match → warning なし
    let s = example1ProkaryoteRawAssembly()
    const assemblyFile = s.fileEntries.find((f) => f.displayName === "assembly.fa")!
    s = submissionReducer(s, {
      type: "set-chip",
      payload: { fileId: assemblyFile.id, axis: "assembly-form", value: "mag" },
    })
    const card = generateFlowCard(s)
    const mss = card.steps.find((s2) => s2.service === "mss")!
    expect(mss.warnings).toEqual([])
  })
})

describe("generateFlowCard / 物理表示順序ソート安定性", () => {
  it("例 2 で JGA は単一 Step (`jga`) で生成され、SERVICE_PHYSICAL_ORDER では togovar の直後 / 外部 Service より前に並ぶ", () => {
    const card = generateFlowCard(example2HumanRestrictedVcf())
    const orderIdx = card.steps.findIndex((s) => s.service === "jga")
    expect(orderIdx).toBeGreaterThan(-1)
    // dbcls-application (Step 0) → jga (Step 1) → humandbs (Step 2) の順
    expect(card.steps.map((s) => s.service)).toEqual([
      "dbcls-application",
      "jga",
      "humandbs",
    ])
  })

  it("例 4 の biosample は merge 後 1 Step (segments で bs-2 → bs-3 を保持)", () => {
    const card = generateFlowCard(example4HostPathogenMix())
    const bsSteps = card.steps.filter((s) => s.service === "biosample")
    expect(bsSteps).toHaveLength(1)
    expect(bsSteps[0]!.id).toBe("step-biosample-bs-2")
    expect(bsSteps[0]!.segments?.map((seg) => seg.segmentId)).toEqual([
      "step-biosample-bs-2",
      "step-biosample-bs-3",
    ])
  })
})
