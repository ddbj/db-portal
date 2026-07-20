import { fc, test } from "@fast-check/vitest"
import { expect } from "vitest"

import { requiresHumandbsApplication } from "../../../../app/features/submit/access"
import { ENGINE_MESSAGE_KEYS as MK } from "../../../../app/features/submit/flow-rules/messages"
import { humandbsPolicySteps } from "../../../../app/features/submit/flow-rules/recipes/humandbs-policy"
import type { FileEntry } from "../../../../app/schemas/submit"
import { arbAccessSection, arbOrganismDomain } from "../../arbitraries/submission"
import { arbSubmission } from "../../arbitraries/submission"

const RUNS = { numRuns: 1000 }

const arbEntries: fc.Arbitrary<FileEntry[]> = arbSubmission.map((s) => s.fileEntries)
const arbOrganismDomainOrNull = fc.option(arbOrganismDomain, { nil: null })

test.prop([arbEntries, arbAccessSection], RUNS)(
  "humandbsPolicySteps_nonHumanOrganismDomain_yieldsNoSteps",
  (entries, section) => {
    expect(humandbsPolicySteps(entries, "eukaryote", section)).toEqual([])
    expect(humandbsPolicySteps(entries, "prokaryote", section)).toEqual([])
    expect(humandbsPolicySteps(entries, "virus", section)).toEqual([])
    expect(humandbsPolicySteps(entries, "metagenome", section)).toEqual([])
    expect(humandbsPolicySteps(entries, "other", section)).toEqual([])
    expect(humandbsPolicySteps(entries, null, section)).toEqual([])
  },
)

test.prop([arbEntries], RUNS)(
  "humandbsPolicySteps_humanButOutOfScope_yieldsNoSteps",
  (entries) => {
    // 指針対象 3 boolean がいずれも false なら humandbs 不要
    const section = { restrictedPreference: false, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: true, microbialAnalysis: false }
    expect(humandbsPolicySteps(entries, "human", section)).toEqual([])
  },
)

test.prop([arbAccessSection], RUNS)(
  "humandbsPolicySteps_emptyEntries_yieldsNoSteps",
  (section) => {
    expect(humandbsPolicySteps([], "human", section)).toEqual([])
  },
)

test.prop([arbEntries, arbAccessSection], RUNS)(
  "humandbsPolicySteps_requiresApplication_yieldsExactlyOneHumandbsStep",
  (entries, section) => {
    fc.pre(entries.length > 0)
    fc.pre(requiresHumandbsApplication("human", section))
    const steps = humandbsPolicySteps(entries, "human", section)
    expect(steps).toHaveLength(1)
    expect(steps[0]!.service).toBe("humandbs")
    expect(steps[0]!.origin).toBe("recipe")
  },
)

test.prop([arbEntries, arbAccessSection], RUNS)(
  "humandbsPolicySteps_requiresApplication_scopeCoversEveryEntry",
  (entries, section) => {
    fc.pre(entries.length > 0)
    fc.pre(requiresHumandbsApplication("human", section))
    const steps = humandbsPolicySteps(entries, "human", section)
    const expected = new Set(entries.map((e) => e.id))
    expect(new Set(steps[0]!.scope.entryIds)).toEqual(expected)
  },
)

test.prop([arbEntries, arbAccessSection], RUNS)(
  "humandbsPolicySteps_requiresApplication_carriesPolicyAndNbdcNotes",
  (entries, section) => {
    fc.pre(entries.length > 0)
    fc.pre(requiresHumandbsApplication("human", section))
    const keys = humandbsPolicySteps(entries, "human", section)[0]!.notes.map((n) => n.messageKey)
    expect(keys).toContain(MK.jgaPolicyApplication)
    expect(keys).toContain(MK.jgaNbdcPolicy)
  },
)

test.prop([arbEntries, arbOrganismDomainOrNull, arbAccessSection], RUNS)(
  "humandbsPolicySteps_calledTwice_isIdempotent",
  (entries, organismDomain, section) => {
    const first = humandbsPolicySteps(entries, organismDomain, section)
    const second = humandbsPolicySteps(entries, organismDomain, section)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  },
)

test.prop([arbEntries, arbOrganismDomainOrNull, arbAccessSection], RUNS)(
  "humandbsPolicySteps_anyInput_doesNotMutateEntries",
  (entries, organismDomain, section) => {
    const snapshot = JSON.stringify(entries)
    humandbsPolicySteps(entries, organismDomain, section)
    expect(JSON.stringify(entries)).toBe(snapshot)
  },
)

test.prop([arbOrganismDomainOrNull, arbAccessSection], RUNS)(
  "requiresHumandbsApplication_matchesTruthTable",
  (organismDomain, section) => {
    const expected = organismDomain === "human"
      && (section.restrictedPreference || section.hasIdentifier || section.ethicsCompliance)
    expect(requiresHumandbsApplication(organismDomain, section)).toBe(expected)
  },
)
