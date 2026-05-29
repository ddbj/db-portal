import { describe, expect, test } from "vitest"

import { allowedRepos, enabledKinds, isKindEnabled, isQ2Enabled } from "../../../../app/features/submit/cascade"
import { deriveFlowSteps } from "../../../../app/features/submit/flow-rules"
import {
  type Access,
  FileTypeKind,
  isDestinationService,
  Q1,
  Q2,
  type Submission,
} from "../../../../app/schemas/submit"

describe("submit cascade", () => {
  test("isQ2Enabled_restrictedNonHuman_disabled", () => {
    for (const q2 of ["eukaryote", "prokaryote", "virus"] as const) {
      expect(isQ2Enabled("restricted", q2)).toBe(false)
    }
  })

  test("isQ2Enabled_restrictedHumanOrMetagenome_enabled", () => {
    expect(isQ2Enabled("restricted", "human")).toBe(true)
    expect(isQ2Enabled("restricted", "metagenome")).toBe(true)
  })

  test("isQ2Enabled_publicAndThirdParty_allEnabled", () => {
    for (const q2 of Q2.options) {
      expect(isQ2Enabled("public", q2)).toBe(true)
      expect(isQ2Enabled("third-party", q2)).toBe(true)
    }
  })

  test("enabledKinds_restrictedHuman_onlyJgaCapableKinds", () => {
    expect(new Set(enabledKinds("restricted", "human"))).toEqual(
      new Set(["sequence-read", "variant", "microarray-expression"]),
    )
  })

  test("enabledKinds_thirdParty_onlyTradAndMetabobankKinds", () => {
    expect(new Set(enabledKinds("third-party", "human"))).toEqual(
      new Set([
        "sequence-nucleotide",
        "sequence-annotation",
        "mass-spectrometry",
        "nmr",
        "metabolite-assignment",
      ]),
    )
  })

  test("enabledKinds_publicHuman_allEleven", () => {
    expect(new Set(enabledKinds("public", "human"))).toEqual(new Set(FileTypeKind.options))
  })

  test("cascade_restrictedEukaryote_isUnreachableDeadEnd", () => {
    // Q2 disable により到達不能。到達できたとしても allowedRepos は空
    expect(allowedRepos("restricted", "eukaryote")).toEqual([])
  })

  // cascade-no-deadend: 到達可能な (q1,q2) では必ず 1 種別以上 enable される
  test("cascadeNoDeadEnd_anyReachablePrecondition_hasEnabledKind", () => {
    for (const q1 of Q1.options) {
      for (const q2 of Q2.options) {
        if (!isQ2Enabled(q1, q2)) continue
        expect(enabledKinds(q1, q2).length).toBeGreaterThan(0)
      }
    }
  })

  // enable された種別の entry を入れると destination service が 1 枚以上出る
  test("cascadeNoDeadEnd_enabledKindEntry_yieldsDestinationStep", () => {
    for (const q1 of Q1.options) {
      for (const q2 of Q2.options) {
        if (!isQ2Enabled(q1, q2)) continue
        const access: Access = q1 === "restricted" ? "restricted" : "open"
        for (const kind of FileTypeKind.options) {
          if (!isKindEnabled(q1, q2, kind)) continue
          const submission: Submission = {
            preconditions: { q1, q2 },
            fileEntries: [
              {
                id: "e0",
                fileTypeKind: kind,
                filename: "f",
                access,
                dataForm: "raw",
                groupId: "g0",
                chipTags: [],
              },
            ],
            fileGroups: [{ id: "g0", groupType: "single", memberFileIds: ["e0"], linkedGroupIds: [] }],
            notes: "",
          }
          const steps = deriveFlowSteps(submission)
          expect(steps.some((s) => isDestinationService(s.service))).toBe(true)
        }
      }
    }
  })
})
