// submit-alt3 context.ts (JgaContext / BpSplitContext) test
// SSOT: docs/submit-alt3-flow-rules.md §8.1 Rule 5 / Rule 6

import { describe, expect, it } from "vitest"

import { submissionReducer } from "@/lib/submit-alt3/reducer"
import {
  computeBpSplitContext,
  computeFlowGenContext,
  computeJgaContext,
} from "@/lib/submit-alt3/rules/context"
import {
  type AccessRestriction,
  createEmptySubmission,
  type Organism,
  type Submission,
} from "@/types/submit-alt3"

// helper: 1 single-file Group を加えて organism/access を設定する
const addSingleFile = (
  s: Submission,
  displayName: string,
  organism: Organism,
  access: AccessRestriction,
): Submission => {
  let result = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "sequence-read",
      groupType: "single",
      members: [{ displayName, role: "single" }],
      defaultDataForm: "raw",
    },
  })
  const newFile = result.fileEntries.find((f) => f.displayName === displayName)!
  result = submissionReducer(result, {
    type: "edit-cell",
    payload: { fileId: newFile.id, column: "organism", value: organism },
  })
  result = submissionReducer(result, {
    type: "edit-cell",
    payload: { fileId: newFile.id, column: "accessRestriction", value: access },
  })

  return result
}

describe("computeJgaContext", () => {
  it("空 Submission → enabled=false / file/group set 空", () => {
    const jga = computeJgaContext(createEmptySubmission())
    expect(jga.enabled).toBe(false)
    expect(jga.jgaFileIds.size).toBe(0)
    expect(jga.jgaGroupIds.size).toBe(0)
  })

  it("human + restricted の file 1 件で enabled=true", () => {
    const s = addSingleFile(createEmptySubmission(), "a.fastq", "human", "restricted")
    const jga = computeJgaContext(s)
    expect(jga.enabled).toBe(true)
    expect(jga.jgaFileIds.has("file-1")).toBe(true)
    expect(jga.jgaGroupIds.has("group-1")).toBe(true)
  })

  it("human + open は集約対象外", () => {
    const s = addSingleFile(createEmptySubmission(), "a.fastq", "human", "open")
    const jga = computeJgaContext(s)
    expect(jga.enabled).toBe(false)
  })

  it("human-microbiome + restricted も集約対象", () => {
    const s = addSingleFile(
      createEmptySubmission(),
      "a.fastq",
      "human-microbiome",
      "restricted",
    )
    const jga = computeJgaContext(s)
    expect(jga.enabled).toBe(true)
    expect(jga.jgaFileIds.has("file-1")).toBe(true)
  })

  it("prokaryote + restricted は対象外 (organism scope 外)", () => {
    const s = addSingleFile(
      createEmptySubmission(),
      "a.fastq",
      "prokaryote",
      "restricted",
    )
    const jga = computeJgaContext(s)
    expect(jga.enabled).toBe(false)
  })

  it("Group 内に restricted human + open pathogen が混在しても Group は jgaGroupIds に入る", () => {
    let s = createEmptySubmission()
    s = submissionReducer(s, {
      type: "add-file",
      payload: {
        buttonType: "sequence-read",
        groupType: "pair-end",
        members: [
          { displayName: "host.fastq", role: "r1" },
          { displayName: "pathogen.fastq", role: "r2" },
        ],
        defaultDataForm: "raw",
      },
    })
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: "file-1", column: "organism", value: "human" },
    })
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: "file-1", column: "accessRestriction", value: "restricted" },
    })
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: "file-2", column: "organism", value: "prokaryote" },
    })
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: "file-2", column: "accessRestriction", value: "open" },
    })
    const jga = computeJgaContext(s)
    expect(jga.jgaFileIds.has("file-1")).toBe(true)
    expect(jga.jgaFileIds.has("file-2")).toBe(false)
    // group は member の or 判定なので jgaGroupIds に入る
    expect(jga.jgaGroupIds.has("group-1")).toBe(true)
  })
})

describe("computeBpSplitContext / Union-Find", () => {
  it("空 → assignments=[] / umbrellaRequired=false / haplotypeMode=false", () => {
    const s = createEmptySubmission()
    const ctx = computeBpSplitContext(s, computeJgaContext(s))
    expect(ctx.assignments).toEqual([])
    expect(ctx.umbrellaRequired).toBe(false)
    expect(ctx.haplotypeMode).toBe(false)
  })

  it("単一 organism (prokaryote) → assignments=1, umbrellaRequired=false", () => {
    const s = addSingleFile(createEmptySubmission(), "a.fastq", "prokaryote", "open")
    const ctx = computeBpSplitContext(s, computeJgaContext(s))
    expect(ctx.assignments).toHaveLength(1)
    expect(ctx.assignments[0]!.organisms).toEqual(["prokaryote"])
    expect(ctx.assignments[0]!.commonLineage).toBe("Bacteria")
    expect(ctx.umbrellaRequired).toBe(false)
  })

  it("既存 primaryBioProjects[0].id を 1 個目の assignment に再利用 (id 安定性)", () => {
    const s = addSingleFile(createEmptySubmission(), "a.fastq", "prokaryote", "open")
    const expectedId = s.primaryBioProjects[0]!.id
    const ctx = computeBpSplitContext(s, computeJgaContext(s))
    expect(ctx.assignments[0]!.bpId).toBe(expectedId)
  })

  it("human + eukaryote (PHYLOGENY small) → 1 BP に統合 (Mammalia + Eukaryote 共通)", () => {
    let s = addSingleFile(createEmptySubmission(), "a.fastq", "human", "open")
    s = addSingleFile(s, "b.fastq", "eukaryote", "open")
    const ctx = computeBpSplitContext(s, computeJgaContext(s))
    expect(ctx.assignments).toHaveLength(1)
    expect(ctx.assignments[0]!.organisms.sort()).toEqual(
      ["eukaryote", "human"].sort(),
    )
    expect(ctx.umbrellaRequired).toBe(false)
  })

  it("human + prokaryote (PHYLOGENY large) → 2 BP に分裂 + umbrellaRequired=true", () => {
    let s = addSingleFile(createEmptySubmission(), "a.fastq", "human", "open")
    s = addSingleFile(s, "b.fastq", "prokaryote", "open")
    const ctx = computeBpSplitContext(s, computeJgaContext(s))
    expect(ctx.assignments).toHaveLength(2)
    expect(ctx.umbrellaRequired).toBe(true)
  })

  it("haplotype-mode=phased chip が 1 file でも立てば haplotypeMode=true + umbrellaRequired=true", () => {
    let s = addSingleFile(createEmptySubmission(), "a.fa", "eukaryote", "open")
    s = submissionReducer(s, {
      type: "set-chip",
      payload: {
        fileId: "file-1",
        axis: "haplotype-mode",
        value: "phased",
      },
    })
    const ctx = computeBpSplitContext(s, computeJgaContext(s))
    expect(ctx.haplotypeMode).toBe(true)
    expect(ctx.umbrellaRequired).toBe(true)
  })

  it("JGA 対象 file は eligible から除外 (BP 分裂判定に影響しない)", () => {
    let s = addSingleFile(createEmptySubmission(), "host.fastq", "human", "restricted")
    s = addSingleFile(s, "pathogen.fastq", "prokaryote", "open")
    const jga = computeJgaContext(s)
    const ctx = computeBpSplitContext(s, jga)
    // host は JGA → eligible から外れ、pathogen の 1 系統だけ残る
    expect(ctx.assignments).toHaveLength(1)
    expect(ctx.assignments[0]!.organisms).toEqual(["prokaryote"])
    expect(ctx.umbrellaRequired).toBe(false)
  })

  it("deterministic: 同じ submission に対して 2 回呼ぶと結果は deep equal", () => {
    let s = addSingleFile(createEmptySubmission(), "a.fastq", "human", "open")
    s = addSingleFile(s, "b.fastq", "prokaryote", "open")
    s = addSingleFile(s, "c.fastq", "metagenome", "open")
    const jga = computeJgaContext(s)
    const ctxA = computeBpSplitContext(s, jga)
    const ctxB = computeBpSplitContext(s, jga)
    // bpId / commonLineage / organisms の列が同順
    expect(ctxA.assignments.map((a) => a.bpId)).toEqual(
      ctxB.assignments.map((a) => a.bpId),
    )
    expect(ctxA.assignments.map((a) => a.commonLineage)).toEqual(
      ctxB.assignments.map((a) => a.commonLineage),
    )
    expect(ctxA.assignments.map((a) => a.organisms)).toEqual(
      ctxB.assignments.map((a) => a.organisms),
    )
  })

  it("assignment.organisms は sort 済み (Union-Find groupOrganismsByLineage が sort)", () => {
    let s = addSingleFile(createEmptySubmission(), "a.fastq", "human", "open")
    s = addSingleFile(s, "b.fastq", "eukaryote", "open")
    const ctx = computeBpSplitContext(s, computeJgaContext(s))
    const organisms = ctx.assignments[0]!.organisms
    expect([...organisms]).toEqual([...organisms].sort())
  })

  it("同 organism が複数 file にあっても assignments.organisms は重複なし", () => {
    let s = addSingleFile(createEmptySubmission(), "a.fastq", "prokaryote", "open")
    s = addSingleFile(s, "b.fastq", "prokaryote", "open")
    const ctx = computeBpSplitContext(s, computeJgaContext(s))
    expect(ctx.assignments).toHaveLength(1)
    expect(ctx.assignments[0]!.organisms).toEqual(["prokaryote"])
  })

  it("Haplotype + JGA 両方発火: haplotypeMode=true かつ jga.enabled=true (両 flag 独立)", () => {
    let s = addSingleFile(createEmptySubmission(), "host.fastq", "human", "restricted")
    s = addSingleFile(s, "asm.fa", "eukaryote", "open")
    s = submissionReducer(s, {
      type: "set-chip",
      payload: { fileId: "file-2", axis: "haplotype-mode", value: "phased" },
    })
    const jga = computeJgaContext(s)
    const ctx = computeBpSplitContext(s, jga)
    expect(jga.enabled).toBe(true)
    expect(ctx.haplotypeMode).toBe(true)
    expect(ctx.umbrellaRequired).toBe(true)
  })

  it("assignment 2 個目の bpId は bp-split-2", () => {
    let s = addSingleFile(createEmptySubmission(), "a.fastq", "human", "open")
    s = addSingleFile(s, "b.fastq", "prokaryote", "open")
    const ctx = computeBpSplitContext(s, computeJgaContext(s))
    // 1 個目は既存 BP id (bp-1)、2 個目は bp-split-2
    expect(ctx.assignments[1]!.bpId).toBe("bp-split-2")
  })

  it("fileIds / groupIds が organism と対応 (Set でアクセス可能)", () => {
    let s = addSingleFile(createEmptySubmission(), "human.fastq", "human", "open")
    s = addSingleFile(s, "prok.fastq", "prokaryote", "open")
    const ctx = computeBpSplitContext(s, computeJgaContext(s))
    const humanAssignment = ctx.assignments.find((a) =>
      a.organisms.includes("human"),
    )!
    const prokAssignment = ctx.assignments.find((a) =>
      a.organisms.includes("prokaryote"),
    )!
    expect(humanAssignment.fileIds.has("file-1")).toBe(true)
    expect(humanAssignment.fileIds.has("file-2")).toBe(false)
    expect(prokAssignment.fileIds.has("file-2")).toBe(true)
    expect(humanAssignment.groupIds.has("group-1")).toBe(true)
    expect(prokAssignment.groupIds.has("group-2")).toBe(true)
  })
})

describe("computeFlowGenContext", () => {
  it("jga / bpSplit を束ねた struct を返す", () => {
    let s = addSingleFile(createEmptySubmission(), "a.fastq", "human", "restricted")
    s = addSingleFile(s, "b.fastq", "prokaryote", "open")
    const ctx = computeFlowGenContext(s)
    expect(ctx.jga.enabled).toBe(true)
    expect(ctx.bpSplit.assignments).toHaveLength(1) // pathogen のみ eligible
  })
})
