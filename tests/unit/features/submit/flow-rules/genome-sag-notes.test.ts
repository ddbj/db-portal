import { describe, expect, test } from "vitest"

import { deriveFlowSteps } from "~/features/submit/flow-rules"
import type { FileEntryChip, FlowStep, Submission } from "~/schemas/submit"

const TSA_NOTE = "submit.ddbj.genome.tsaRawReadsToDra"
const VIRUS_NOTE = "submit.ddbj.genome.virusPlasmidOrganelleNoBioproject"
const SAG_OPTIONAL_NOTE = "submit.sequenceDra.sagOptional"

const servicesOf = (steps: readonly FlowStep[]): string[] => steps.map((s) => s.service)

const stepFor = (steps: readonly FlowStep[], service: string): FlowStep => {
  const matches = steps.filter((s) => s.service === service)
  expect(matches).toHaveLength(1)

  return matches[0]!
}

const warningKeys = (step: FlowStep): string[] =>
  step.notes.filter((n) => n.kind === "warning").map((n) => n.messageKey)

const sequenceSubmission = (chipTags: readonly FileEntryChip[]): Submission => ({
  preconditions: { organismDomain: "prokaryote" },
  accessSection: { restrictedPreference: false, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: false, microbialAnalysis: false },
  fileEntries: [
    {
      id: "e1",
      fileTypeKind: "sequence",
      access: "open",
      dataForm: "assembled",
      groupId: "g1",
      chipTags: [...chipTags],
    },
  ],
  fileGroups: [{ id: "g1", groupType: "single", memberFileIds: ["e1"], linkedGroupIds: [] }],
  notes: "",
})

describe("deriveFlowSteps genome and SAG notes", () => {
  test("deriveFlowSteps_annotatedGenome_warnsAboutTsaDraAndVirusPlasmidOrganelle", () => {
    const steps = deriveFlowSteps(sequenceSubmission([
      { axis: "assembly-form", value: "genome" },
      { axis: "has-annotation", value: "true" },
    ]))

    const ddbj = stepFor(steps, "ddbj")
    expect(warningKeys(ddbj)).toEqual([TSA_NOTE, VIRUS_NOTE])
    expect(servicesOf(steps)).toContain("bioproject")
    expect(servicesOf(steps)).toContain("biosample")
  })

  test("deriveFlowSteps_unannotatedGenome_warnsAboutTsaDraAndVirusPlasmidOrganelle", () => {
    const steps = deriveFlowSteps(sequenceSubmission([
      { axis: "assembly-form", value: "genome" },
    ]))

    expect(warningKeys(stepFor(steps, "ddbj"))).toEqual([TSA_NOTE, VIRUS_NOTE])
  })

  test("deriveFlowSteps_geneSequence_doesNotWarnAboutGenomeCases", () => {
    const steps = deriveFlowSteps(sequenceSubmission([
      { axis: "assembly-form", value: "gene" },
      { axis: "has-annotation", value: "true" },
    ]))

    const keys = warningKeys(stepFor(steps, "ddbj"))
    expect(keys).not.toContain(TSA_NOTE)
    expect(keys).not.toContain(VIRUS_NOTE)
  })

  test("deriveFlowSteps_sag_emitsNoDraAndWarnsThatDraIsOptional", () => {
    const steps = deriveFlowSteps(sequenceSubmission([
      { axis: "assembly-form", value: "sag" },
      { axis: "has-annotation", value: "true" },
    ]))

    expect(servicesOf(steps)).not.toContain("dra")
    expect(warningKeys(stepFor(steps, "ddbj"))).toEqual([SAG_OPTIONAL_NOTE])
  })

  test("deriveFlowSteps_mag_stillEmitsDra", () => {
    const steps = deriveFlowSteps(sequenceSubmission([
      { axis: "assembly-form", value: "mag" },
      { axis: "has-annotation", value: "true" },
    ]))

    expect(servicesOf(steps)).toContain("dra")
  })
})
