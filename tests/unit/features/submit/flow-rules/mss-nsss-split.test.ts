import { describe, expect, test } from "vitest"

import { deriveFlowSteps } from "~/features/submit/flow-rules"
import type { FileEntry, FileGroup, FlowStep, Submission } from "~/schemas/submit"

const servicesOf = (steps: readonly FlowStep[]): string[] => steps.map((s) => s.service)

const destinationOf = (steps: readonly FlowStep[]): FlowStep => {
  const dests = steps.filter((s) => s.service === "ddbj" || s.service === "nsss")
  expect(dests).toHaveLength(1)

  return dests[0]!
}

const singleNucleotide = (
  preconditions: Submission["preconditions"],
  overrides: Partial<FileEntry> = {},
): Submission => {
  const entry: FileEntry = {
    id: "e1",
    fileTypeKind: "sequence-nucleotide",
    access: "open",
    dataForm: "assembled",
    groupId: "g1",
    chipTags: [],
    ...overrides,
  }
  const group: FileGroup = { id: "g1", groupType: "single", memberFileIds: ["e1"], linkedGroupIds: [] }

  return { preconditions, fileEntries: [entry], fileGroups: [group], notes: "" }
}

// 塩基配列アノテーション登録の MSS (ddbj) / NSSS (nsss) 振り分け境界を固定する。
// 契約は docs/submit.md「### MSS / NSSS の振り分け」: NSSS 非対応種別 (TPA など) と
// 完成ゲノムは MSS (ddbj)、小規模・非完成は NSSS (nsss)。
describe("MSS/NSSS split", () => {
  test("deriveFlowSteps_publicEukaryoteSequenceNucleotide_routesToNsssNotDdbjTrad", () => {
    // 第三者でなく mag-sag-chain でもない素の配列は fallback で NSSS Web 登録窓口に行く
    const steps = deriveFlowSteps(singleNucleotide({ q1: "public", q2: "eukaryote" }))

    expect(servicesOf(steps)).toEqual(["bioproject", "biosample", "nsss"])

    const dest = destinationOf(steps)
    expect(dest.service).toBe("nsss")
    expect(dest.origin).toBe("tier1")
    expect(dest.scope.entryIds).toEqual(["e1"])
    expect(dest.notes.map((n) => n.messageKey)).toContain("submit.nsss.intro")
    // collapse 検知: ddbj に流れ込んでいない
    expect(steps.some((s) => s.service === "ddbj")).toBe(false)
  })

  test("deriveFlowSteps_thirdPartySequenceNucleotide_routesToDdbjTradNotNsss", () => {
    // TPA は NSSS 非対応種別なので MSS (ddbj) のみ。前段 Q1=third-party が唯一の起点
    const steps = deriveFlowSteps(singleNucleotide({ q1: "third-party", q2: "eukaryote" }))

    expect(servicesOf(steps)).toEqual(["bioproject", "biosample", "ddbj"])

    const dest = destinationOf(steps)
    expect(dest.service).toBe("ddbj")
    expect(dest.origin).toBe("tier1")
    expect(dest.notes.map((n) => n.messageKey)).toContain(
      "submit.ddbj.tpa.primaryAccessionRequired",
    )
    // collapse 検知: NSSS に流れ込んでいない
    expect(steps.some((s) => s.service === "nsss")).toBe(false)
  })

  test("deriveFlowSteps_magCompletedGenomeChain_routesToDdbjTradNotNsss", () => {
    // 完成度・連携で MSS に回す代表例: MAG ゲノムエントリは ENV division (ddbj) へ
    const submission: Submission = {
      preconditions: { q1: "public", q2: "metagenome" },
      fileEntries: [
        {
          id: "raw1",
          fileTypeKind: "sequence-read",
          access: "open",
          dataForm: "raw",
          groupId: "g1",
          chipTags: [{ axis: "assembly-form", value: "raw" }],
        },
        {
          id: "mag1",
          fileTypeKind: "sequence-nucleotide",
          access: "open",
          dataForm: "assembled",
          groupId: "g1",
          chipTags: [{ axis: "assembly-form", value: "mag" }],
        },
      ],
      fileGroups: [
        { id: "g1", groupType: "mag-sag-chain", memberFileIds: ["raw1", "mag1"], linkedGroupIds: [] },
      ],
      notes: "",
    }

    const steps = deriveFlowSteps(submission)

    const trad = steps.filter((s) => s.service === "ddbj")
    expect(trad).toHaveLength(1)
    expect(trad[0]!.scope.entryIds).toContain("mag1")
    // 完成ゲノムの配列は NSSS Web 窓口には行かない
    expect(steps.some((s) => s.service === "nsss")).toBe(false)
  })

  test("deriveFlowSteps_nsssVsDdbjTradBoundary_doesNotCollapseOntoOneService", () => {
    // 同じ fileTypeKind=sequence-nucleotide でも Q1 の差だけで destination が割れることを固定し、
    // 両ケースが片方の service に潰れる回帰を捕まえる
    const nsssDest = destinationOf(
      deriveFlowSteps(singleNucleotide({ q1: "public", q2: "eukaryote" })),
    )
    const tradDest = destinationOf(
      deriveFlowSteps(singleNucleotide({ q1: "third-party", q2: "eukaryote" })),
    )

    expect(nsssDest.service).toBe("nsss")
    expect(tradDest.service).toBe("ddbj")
    expect(nsssDest.service).not.toBe(tradDest.service)
  })
})
