import { describe, expect, test } from "vitest"

import { allowedRepos, enabledKinds, isKindEnabled } from "../../../../app/features/submit/cascade"
import { deriveFlowSteps } from "../../../../app/features/submit/flow-rules"
import {
  type Access,
  FileTypeKind,
  isSubmissionEndpoint,
  OrganismDomain,
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

  test("cascadeNoDeadEnd_anyOrganismDomain_hasEnabledKind", () => {
    for (const organismDomain of OrganismDomain.options) {
      expect(enabledKinds(organismDomain).length).toBeGreaterThan(0)
    }
  })

  test("cascadeNoDeadEnd_enabledKindEntry_yieldsEndpointStep", () => {
    for (const organismDomain of OrganismDomain.options) {
      const access: Access = "open"
      for (const kind of FileTypeKind.options) {
        if (!isKindEnabled(organismDomain, kind)) continue
        const submission: Submission = {
          preconditions: { organismDomain },
          accessSection: {
            restrictedPreference: false,
            hasIdentifier: false,
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
