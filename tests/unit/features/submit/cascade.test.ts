import { describe, expect, test } from "vitest"

import { allowedRepos, enabledKinds, isKindEnabled } from "../../../../app/features/submit/cascade"
import { deriveFlowSteps } from "../../../../app/features/submit/flow-rules"
import {
  type Access,
  FileTypeKind,
  isSubmissionEndpoint,
  Q2,
  type Submission,
} from "../../../../app/schemas/submit"

describe("submit cascade", () => {
  test("enabledKinds_human_allNine", () => {
    expect(new Set(enabledKinds("human"))).toEqual(new Set(FileTypeKind.options))
  })

  test("enabledKinds_eukaryote_allNine", () => {
    expect(new Set(enabledKinds("eukaryote"))).toEqual(new Set(FileTypeKind.options))
  })

  test("cascade_eukaryote_isReachable", () => {
    expect(allowedRepos("eukaryote").length).toBeGreaterThan(0)
  })

  test("cascadeNoDeadEnd_anyQ2_hasEnabledKind", () => {
    for (const q2 of Q2.options) {
      expect(enabledKinds(q2).length).toBeGreaterThan(0)
    }
  })

  test("cascadeNoDeadEnd_enabledKindEntry_yieldsEndpointStep", () => {
    for (const q2 of Q2.options) {
      const access: Access = "open"
      for (const kind of FileTypeKind.options) {
        if (!isKindEnabled(q2, kind)) continue
        const submission: Submission = {
          preconditions: { q2 },
          accessSection: {
            restrictedPreference: false,
            ethicsCompliance: true,
            publiclyAvailable: false,
            microbialAnalysis: false,
          },
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
  })
})
