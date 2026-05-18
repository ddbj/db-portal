// submit-alt3 flow rule orchestrator が事前計算する context
// SSOT: docs/submit-alt3-flow-rules.md §8.1 Rule 5 / Rule 6
//
// - JgaContext: Rule 6 集約対象の File / Group (`organism ∈ {human, human-microbiome}` + `access=restricted`)
// - BpSplitContext: Rule 5 系統距離判定による Primary BP 分裂 (open 行集合で評価、JGA 対象は除外)
//
// 各 rule ファイル (rule01..rule15) はこの context を読んで Step を生成する。

import {
  JGA_TARGET_ORGANISMS,
  ORGANISM_TO_LINEAGE,
  PHYLOGENY_DISTANCE_TABLE,
} from "@/lib/mock-data/submit-alt3"
import type {
  FileEntry,
  Organism,
  Submission,
} from "@/types/submit-alt3"

import { fileChipValue, organismsInSubmission } from "./shared"

// ----- JgaContext -----

export interface JgaContext {
  // restricted human / human-microbiome 行が 1 件でもある場合 true
  enabled: boolean
  // JGA 集約対象の FileEntry.id
  jgaFileIds: Set<string>
  // JGA 集約対象の FileGroup.id (どれか 1 メンバが対象なら true)
  jgaGroupIds: Set<string>
}

export const computeJgaContext = (submission: Submission): JgaContext => {
  const jgaFileIds = new Set<string>()
  for (const f of submission.fileEntries) {
    if (
      f.organism !== undefined &&
      JGA_TARGET_ORGANISMS.includes(f.organism) &&
      f.accessRestriction === "restricted"
    ) {
      jgaFileIds.add(f.id)
    }
  }

  const jgaGroupIds = new Set<string>()
  for (const g of submission.fileGroups) {
    if (g.memberFileIds.some((id) => jgaFileIds.has(id))) {
      jgaGroupIds.add(g.id)
    }
  }

  return {
    enabled: jgaFileIds.size > 0,
    jgaFileIds,
    jgaGroupIds,
  }
}

// ----- BpSplitContext -----

// 1 つの Primary BP に紐づく論理単位
export interface PrimaryBpAssignment {
  // BP id (`submission.primaryBioProjects[0].id` を最初の 1 個に流用、追加分は `bp-split-${n}`)
  bpId: string
  // 共通系統名 (UI 表示用)
  commonLineage: string
  // この BP に属する organism 集合 (Rule 5 系統距離マップで「small」関係のみで構成)
  organisms: Organism[]
  // この BP に属する FileEntry.id
  fileIds: Set<string>
  // この BP に属する FileGroup.id
  groupIds: Set<string>
  // Haplotype phased 由来の分裂か (Rule 11)
  haplotypePhase?: "principal" | "alternate" | "dra-shared"
}

export interface BpSplitContext {
  // 0 個 (JGA only) ~ N 個
  assignments: PrimaryBpAssignment[]
  // Rule 2 Umbrella BP が必要か (assignments.length >= 2)
  umbrellaRequired: boolean
  // Haplotype phased が発火しているか (Rule 11)
  haplotypeMode: boolean
}

// PoC 簡略実装: organism ごとに 1 BP 候補を持ち、PHYLOGENY_DISTANCE_TABLE で
// 「small」 関係のもの同士を 1 BP に統合、「large」 関係なら別 BP に分割する。
// Union-Find で organism をグルーピング。
const groupOrganismsByLineage = (
  organisms: readonly Organism[],
): Organism[][] => {
  if (organisms.length === 0) return []

  const parent = new Map<Organism, Organism>()
  const find = (x: Organism): Organism => {
    const p = parent.get(x)
    if (p === undefined || p === x) {
      parent.set(x, x)

      return x
    }
    const r = find(p)
    parent.set(x, r)

    return r
  }
  const union = (a: Organism, b: Organism): void => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }

  for (const o of organisms) find(o)

  for (let i = 0; i < organisms.length; i++) {
    const a = organisms[i]
    if (a === undefined) continue
    for (let j = i + 1; j < organisms.length; j++) {
      const b = organisms[j]
      if (b === undefined) continue
      const dist = PHYLOGENY_DISTANCE_TABLE[a]?.[b]
      if (dist === "small") union(a, b)
    }
  }

  const groups = new Map<Organism, Organism[]>()
  for (const o of organisms) {
    const r = find(o)
    const bucket = groups.get(r) ?? []
    bucket.push(o)
    groups.set(r, bucket)
  }

  return Array.from(groups.values()).map((g) => g.sort())
}

// Rule 5: Primary BP 分裂判定 (JGA 対象を除外した open 行集合で評価)
// Rule 11: Haplotype phased が混じる場合は別ロジック (本関数では haplotypeMode=true を返すだけで、
//          実際の Principal/Alternate/DRA-shared BP 生成は rule11 が担当)
export const computeBpSplitContext = (
  submission: Submission,
  jga: JgaContext,
): BpSplitContext => {
  // Rule 6 集約対象でない FileEntry のみで判定
  const eligibleFiles = submission.fileEntries.filter(
    (f) => !jga.jgaFileIds.has(f.id),
  )

  // Haplotype phased 検出 (Rule 11)
  const haplotypeMode = eligibleFiles.some(
    (f) => fileChipValue(f, "haplotype-mode") === "phased",
  )

  // organism 集合 (eligible のみ)
  const organisms = uniqueOrganisms(eligibleFiles)

  if (organisms.length === 0) {
    return { assignments: [], umbrellaRequired: false, haplotypeMode }
  }

  // PoC: BP 分裂は organism の系統距離だけで判定 (Rule 5)
  // Haplotype phased の Principal/Alternate/DRA-shared は rule11 で別途生成するので
  // 本 context では haplotype 系も「1 集合」として扱う (rule11 が後で分裂)。
  const grouped = groupOrganismsByLineage(organisms)

  // 既存 state の primaryBioProjects[0].id をなるべく再利用 (id 安定性)
  const baseBpId = submission.primaryBioProjects[0]?.id ?? "bp-1"

  const assignments: PrimaryBpAssignment[] = grouped.map((orgs, idx) => {
    const bpId = idx === 0 ? baseBpId : `bp-split-${idx + 1}`
    const lineage = orgs
      .map((o) => ORGANISM_TO_LINEAGE[o])
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(" / ")

    const orgSet = new Set(orgs)
    const fileIds = new Set<string>()
    const groupIds = new Set<string>()
    for (const f of eligibleFiles) {
      if (f.organism !== undefined && orgSet.has(f.organism)) {
        fileIds.add(f.id)
        groupIds.add(f.groupId)
      }
    }

    return { bpId, commonLineage: lineage, organisms: orgs, fileIds, groupIds }
  })

  return {
    assignments,
    umbrellaRequired: assignments.length >= 2 || haplotypeMode,
    haplotypeMode,
  }
}

const uniqueOrganisms = (files: readonly FileEntry[]): Organism[] => {
  const seen = new Set<Organism>()
  for (const f of files) {
    if (f.organism !== undefined) seen.add(f.organism)
  }

  return Array.from(seen)
}

// orchestrator から見える summary
export interface FlowGenContext {
  jga: JgaContext
  bpSplit: BpSplitContext
}

export const computeFlowGenContext = (submission: Submission): FlowGenContext => {
  const jga = computeJgaContext(submission)
  const bpSplit = computeBpSplitContext(submission, jga)

  return { jga, bpSplit }
}

// ----- helper: organismsInSubmission を re-export (orchestrator 内で使用) -----
export { organismsInSubmission }
