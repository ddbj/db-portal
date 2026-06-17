import { describe, expect, test } from "vitest"

import { allowedRepos, enabledKinds, isKindEnabled, isQ2Enabled } from "../../../../app/features/submit/cascade"
import { deriveFlowSteps } from "../../../../app/features/submit/flow-rules"
import {
  type Access,
  FileTypeKind,
  isSubmissionEndpoint,
  Q1,
  Q2,
  type Submission,
} from "../../../../app/schemas/submit"

describe("submit cascade", () => {
  test("isQ2Enabled_restrictedAllQ2_enabled", () => {
    // 公開+制限 の repos は公開系 ∪ JGA = 全 destination なので、全 Q2 が enable される
    for (const q2 of Q2.options) {
      expect(isQ2Enabled("restricted", q2)).toBe(true)
    }
  })

  test("isQ2Enabled_restrictedHuman_onlyHumanEnabled", () => {
    expect(isQ2Enabled("restricted", "human")).toBe(true)
  })

  test("isQ2Enabled_publicAndThirdParty_allEnabled", () => {
    for (const q2 of Q2.options) {
      expect(isQ2Enabled("public", q2)).toBe(true)
      expect(isQ2Enabled("third-party", q2)).toBe(true)
    }
  })

  test("enabledKinds_restrictedHuman_allEleven", () => {
    // repos 拡張により公開+制限でも全種別が選べる (公開分は open、制限分は種別別 access で扱う)
    expect(new Set(enabledKinds("restricted", "human"))).toEqual(new Set(FileTypeKind.options))
  })

  test("enabledKinds_thirdParty_onlyTradKinds", () => {
    expect(new Set(enabledKinds("third-party", "human"))).toEqual(
      new Set([
        "sequence-nucleotide",
        "sequence-annotation",
      ]),
    )
  })

  test("enabledKinds_publicHuman_allEleven", () => {
    expect(new Set(enabledKinds("public", "human"))).toEqual(new Set(FileTypeKind.options))
  })

  test("cascade_restrictedEukaryote_isReachable", () => {
    // 公開+制限 の repos 拡張で制限公開×非ヒトも到達可能になる (非ヒト制限公開は DRA embargo)
    expect(allowedRepos("restricted", "eukaryote").length).toBeGreaterThan(0)
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

  // enable された種別の entry を入れると登録エンドポイント (destination ∪ {jpost, eva}) が 1 枚以上出る
  test("cascadeNoDeadEnd_enabledKindEntry_yieldsEndpointStep", () => {
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
          expect(steps.some((s) => isSubmissionEndpoint(s.service))).toBe(true)
        }
      }
    }
  })
})
