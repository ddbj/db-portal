import { describe, expect, test } from "vitest"

import { deriveFlowSteps } from "~/features/submit/flow-rules"
import type { FlowStep, Submission } from "~/schemas/submit"

const servicesOf = (steps: readonly FlowStep[]): string[] => steps.map((s) => s.service)

const stepFor = (steps: readonly FlowStep[], service: string): FlowStep => {
  const matches = steps.filter((s) => s.service === service)
  expect(matches).toHaveLength(1)

  return matches[0]!
}

const warningKeys = (step: FlowStep): string[] =>
  step.notes.filter((n) => n.kind === "warning").map((n) => n.messageKey)

describe("deriveFlowSteps", () => {
  test("deriveFlowSteps_publicHumanSequenceRead_emitsDraWithDefaultCompanions", () => {
    const submission: Submission = {
      preconditions: { q2: "human" },
      accessSection: { restrictedPreference: false, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: true, microbialAnalysis: false },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "sequence-read",
          access: "open",
          dataForm: "raw",
          groupId: "g1",
          chipTags: [],
        },
      ],
      fileGroups: [
        { id: "g1", groupType: "single", memberFileIds: ["e1"], linkedGroupIds: [] },
      ],
      notes: "",
    }

    const steps = deriveFlowSteps(submission)

    // companion (bioproject -> biosample) precede the destination in physical order
    expect(servicesOf(steps)).toEqual(["bioproject", "biosample", "dra"])

    const dra = stepFor(steps, "dra")
    expect(dra.origin).toBe("tier1")
    expect(dra.scope.entryIds).toEqual(["e1"])
    // open access suppresses the restricted-only embargo note, so no warnings on DRA
    expect(warningKeys(dra)).toEqual([])

    expect(stepFor(steps, "bioproject").origin).toBe("tier2")
    expect(stepFor(steps, "biosample").origin).toBe("tier2")
  })

  test("deriveFlowSteps_restrictedHumanSequenceRead_routesToJgaWithExternalsAndNoDefaultCompanion", () => {
    const submission: Submission = {
      preconditions: { q2: "human" },
      accessSection: { restrictedPreference: true, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: false, microbialAnalysis: false },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "sequence-read",
          access: "restricted",
          dataForm: "raw",
          groupId: "g1",
          chipTags: [],
        },
      ],
      fileGroups: [
        { id: "g1", groupType: "single", memberFileIds: ["e1"], linkedGroupIds: [] },
      ],
      notes: "",
    }

    const steps = deriveFlowSteps(submission)

    // Policy ゲート (humandbs) が依存順で jga より前に出る。提供申請と NBDC ポリシーは humandbs 1 step に
    // 統合され、既定の bioproject/biosample は抑制される
    expect(servicesOf(steps)).toEqual(["humandbs", "jga"])
    expect(steps.some((s) => s.service === "bioproject")).toBe(false)
    expect(steps.some((s) => s.service === "biosample")).toBe(false)

    const jga = stepFor(steps, "jga")
    expect(jga.origin).toBe("recipe")
    expect(jga.scope.entryIds).toEqual(["e1"])

    expect(stepFor(steps, "humandbs").origin).toBe("recipe")
  })

  test("deriveFlowSteps_sequenceWithTpaChip_routesToDdbjWithTpaWarning", () => {
    const submission: Submission = {
      preconditions: { q2: "eukaryote" },
      accessSection: { restrictedPreference: false, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: false, microbialAnalysis: false },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "sequence",
          access: "open",
          dataForm: "assembled",
          groupId: "g1",
          chipTags: [{ axis: "tpa", value: "true" }],
        },
      ],
      fileGroups: [
        { id: "g1", groupType: "single", memberFileIds: ["e1"], linkedGroupIds: [] },
      ],
      notes: "",
    }

    const steps = deriveFlowSteps(submission)

    expect(servicesOf(steps)).toEqual(["bioproject", "biosample", "ddbj"])

    const ddbj = stepFor(steps, "ddbj")
    expect(ddbj.origin).toBe("tier1")
    expect(ddbj.scope.entryIds).toEqual(["e1"])
    expect(warningKeys(ddbj)).toContain("submit.ddbj.tpa.primaryAccessionRequired")
  })

  test("deriveFlowSteps_nonHumanVariant_routesToEvaNotTogovar", () => {
    const submission: Submission = {
      preconditions: { q2: "eukaryote" },
      accessSection: { restrictedPreference: false, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: false, microbialAnalysis: false },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "variant",
          access: "open",
          dataForm: "variant-call",
          groupId: "g1",
          chipTags: [],
        },
      ],
      fileGroups: [
        { id: "g1", groupType: "single", memberFileIds: ["e1"], linkedGroupIds: [] },
      ],
      notes: "",
    }

    const steps = deriveFlowSteps(submission)

    expect(servicesOf(steps)).toEqual(["bioproject", "biosample", "eva"])

    const eva = stepFor(steps, "eva")
    expect(eva.origin).toBe("tier1")
    expect(eva.notes.map((n) => n.messageKey)).toContain("submit.variant.eva.nonHuman")
    expect(steps.some((s) => s.service === "jga")).toBe(false)
  })

  test("deriveFlowSteps_publicHumanVariant_routesToEva", () => {
    const submission: Submission = {
      preconditions: { q2: "human" },
      accessSection: { restrictedPreference: false, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: true, microbialAnalysis: false },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "variant",
          access: "open",
          dataForm: "variant-call",
          groupId: "g1",
          chipTags: [],
        },
      ],
      fileGroups: [
        { id: "g1", groupType: "single", memberFileIds: ["e1"], linkedGroupIds: [] },
      ],
      notes: "",
    }

    const steps = deriveFlowSteps(submission)

    expect(servicesOf(steps)).toEqual(["bioproject", "biosample", "eva"])
    const eva = stepFor(steps, "eva")
    expect(eva.origin).toBe("tier1")
  })

  test("deriveFlowSteps_restrictedHumanVariant_routesToJga", () => {
    const submission: Submission = {
      preconditions: { q2: "human" },
      accessSection: { restrictedPreference: true, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: false, microbialAnalysis: false },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "variant",
          access: "restricted",
          dataForm: "variant-call",
          groupId: "g1",
          chipTags: [],
        },
      ],
      fileGroups: [{ id: "g1", groupType: "single", memberFileIds: ["e1"], linkedGroupIds: [] }],
      notes: "",
    }

    const steps = deriveFlowSteps(submission)

    expect(servicesOf(steps)).toEqual(["humandbs", "jga"])
    expect(steps.some((s) => s.service === "eva")).toBe(false)
    const jga = stepFor(steps, "jga")
    expect(jga.origin).toBe("recipe")
  })

  test("deriveFlowSteps_publicMetagenomeVariant_routesToEva", () => {
    const submission: Submission = {
      preconditions: { q2: "metagenome" },
      accessSection: { restrictedPreference: false, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: false, microbialAnalysis: false },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "variant",
          access: "open",
          dataForm: "variant-call",
          groupId: "g1",
          chipTags: [],
        },
      ],
      fileGroups: [{ id: "g1", groupType: "single", memberFileIds: ["e1"], linkedGroupIds: [] }],
      notes: "",
    }

    const steps = deriveFlowSteps(submission)

    expect(servicesOf(steps)).toEqual(["bioproject", "biosample", "eva"])
    expect(steps.some((s) => s.service === "jga")).toBe(false)
  })

  test("deriveFlowSteps_restrictedMetagenomeVariant_routesToEvaNotJga", () => {
    const submission: Submission = {
      preconditions: { q2: "metagenome" },
      accessSection: { restrictedPreference: true, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: false, microbialAnalysis: false },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "variant",
          access: "restricted",
          dataForm: "variant-call",
          groupId: "g1",
          chipTags: [],
        },
      ],
      fileGroups: [{ id: "g1", groupType: "single", memberFileIds: ["e1"], linkedGroupIds: [] }],
      notes: "",
    }

    const steps = deriveFlowSteps(submission)

    expect(steps.some((s) => s.service === "eva")).toBe(true)
    expect(steps.some((s) => s.service === "jga")).toBe(false)
  })

  test("deriveFlowSteps_magChip_routesAssemblyToDdbjTradViaTier1WithDefaultCompanion", () => {
    const submission: Submission = {
      preconditions: { q2: "metagenome" },
      accessSection: { restrictedPreference: false, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: false, microbialAnalysis: false },
      fileEntries: [
        {
          id: "raw1",
          fileTypeKind: "sequence-read",
          access: "open",
          dataForm: "raw",
          groupId: "g0",
          chipTags: [],
        },
        {
          id: "mag1",
          fileTypeKind: "sequence",
          access: "open",
          dataForm: "assembled",
          groupId: "g1",
          chipTags: [{ axis: "assembly-form", value: "mag" }],
        },
      ],
      fileGroups: [
        { id: "g0", groupType: "single", memberFileIds: ["raw1"], linkedGroupIds: [] },
        { id: "g1", groupType: "single", memberFileIds: ["mag1"], linkedGroupIds: [] },
      ],
      notes: "",
    }

    const steps = deriveFlowSteps(submission)

    const ddbj = stepFor(steps, "ddbj")
    expect(ddbj.origin).toBe("tier1")
    expect(ddbj.scope.entryIds).toEqual(["mag1"])
    const draRun = steps.find((s) => s.service === "dra")!
    expect(draRun.scope.entryIds).toContain("raw1")
    expect(draRun.scope.entryIds).toContain("mag1")
    // companion は既定どおり 1 + 1 (recipe による複数 BioSample 分裂はしない)
    expect(steps.filter((s) => s.service === "bioproject")).toHaveLength(1)
    expect(steps.filter((s) => s.service === "biosample")).toHaveLength(1)
  })

  test("deriveFlowSteps_visiumSpatialTranscriptomics_emitsDraAndGeaTwoStep", () => {
    const submission: Submission = {
      preconditions: { q2: "human" },
      accessSection: { restrictedPreference: false, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: true, microbialAnalysis: false },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "spatial-transcriptomics",
          access: "open",
          dataForm: "matrix",
          groupId: "g1",
          chipTags: [{ axis: "spatial-platform", value: "visium" }],
        },
      ],
      fileGroups: [{ id: "g1", groupType: "single", memberFileIds: ["e1"], linkedGroupIds: [] }],
      notes: "",
    }

    const steps = deriveFlowSteps(submission)

    // Sequencing-type platform: raw reads to DRA (recipe) + processed to GEA (tier1)
    expect(servicesOf(steps)).toEqual(["bioproject", "biosample", "dra", "gea"])
    const dra = stepFor(steps, "dra")
    expect(dra.origin).toBe("recipe")
    expect(dra.scope.entryIds).toEqual(["e1"])
    expect(stepFor(steps, "gea").scope.entryIds).toContain("e1")
  })

  test("deriveFlowSteps_sequenceReadAndVisiumSpatial_unionsIntoSingleDraStep", () => {
    const submission: Submission = {
      preconditions: { q2: "human" },
      accessSection: { restrictedPreference: false, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: true, microbialAnalysis: false },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "sequence-read",
          access: "open",
          dataForm: "raw",
          groupId: "g1",
          chipTags: [],
        },
        {
          id: "e2",
          fileTypeKind: "spatial-transcriptomics",
          access: "open",
          dataForm: "matrix",
          groupId: "g2",
          chipTags: [{ axis: "spatial-platform", value: "visium" }],
        },
      ],
      fileGroups: [
        { id: "g1", groupType: "single", memberFileIds: ["e1"], linkedGroupIds: [] },
        { id: "g2", groupType: "single", memberFileIds: ["e2"], linkedGroupIds: [] },
      ],
      notes: "",
    }

    const steps = deriveFlowSteps(submission)

    // The Tier1 DRA (sequence-read) and the spatial recipe DRA (Visium raw reads)
    // must collapse into one DRA card whose scope covers both entries, not two.
    const dra = stepFor(steps, "dra")
    expect(dra.scope.entryIds).toEqual(["e1", "e2"])
  })

  test("deriveFlowSteps_xeniumSpatialTranscriptomics_emitsGeaOnly", () => {
    const submission: Submission = {
      preconditions: { q2: "human" },
      accessSection: { restrictedPreference: false, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: true, microbialAnalysis: false },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "spatial-transcriptomics",
          access: "open",
          dataForm: "matrix",
          groupId: "g1",
          chipTags: [{ axis: "spatial-platform", value: "xenium" }],
        },
      ],
      fileGroups: [{ id: "g1", groupType: "single", memberFileIds: ["e1"], linkedGroupIds: [] }],
      notes: "",
    }

    const steps = deriveFlowSteps(submission)

    // Microarray-type platform: GEA only, no DRA pre-registration
    expect(servicesOf(steps)).toEqual(["bioproject", "biosample", "gea"])
    expect(steps.some((s) => s.service === "dra")).toBe(false)
  })

  test("deriveFlowSteps_merfishSpatial_emitsGeaWithGeneralistWarningNoDra", () => {
    const submission: Submission = {
      preconditions: { q2: "human" },
      accessSection: { restrictedPreference: false, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: true, microbialAnalysis: false },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "spatial-transcriptomics",
          access: "open",
          dataForm: "matrix",
          groupId: "g1",
          chipTags: [{ axis: "spatial-platform", value: "merfish" }],
        },
      ],
      fileGroups: [{ id: "g1", groupType: "single", memberFileIds: ["e1"], linkedGroupIds: [] }],
      notes: "",
    }

    const steps = deriveFlowSteps(submission)

    expect(steps.some((s) => s.service === "dra")).toBe(false)
    expect(warningKeys(stepFor(steps, "gea"))).toContain("submit.gea.spatialImage.largeImageGeneralist")
  })

  test("deriveFlowSteps_ngsExpressionMatrix_emitsDraAndGeaTwoStep", () => {
    const submission: Submission = {
      preconditions: { q2: "human" },
      accessSection: { restrictedPreference: false, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: true, microbialAnalysis: false },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "expression-matrix",
          access: "open",
          dataForm: "matrix",
          groupId: "g1",
          chipTags: [{ axis: "expression-source", value: "ngs" }],
        },
      ],
      fileGroups: [{ id: "g1", groupType: "single", memberFileIds: ["e1"], linkedGroupIds: [] }],
      notes: "",
    }

    const steps = deriveFlowSteps(submission)

    expect(servicesOf(steps)).toEqual(["bioproject", "biosample", "dra", "gea"])
    const dra = stepFor(steps, "dra")
    expect(dra.origin).toBe("recipe")
    expect(dra.scope.entryIds).toEqual(["e1"])
    expect(stepFor(steps, "gea").scope.entryIds).toContain("e1")
  })

  test("deriveFlowSteps_nonNgsExpressionMatrix_emitsGeaOnly", () => {
    const submission: Submission = {
      preconditions: { q2: "human" },
      accessSection: { restrictedPreference: false, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: true, microbialAnalysis: false },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "expression-matrix",
          access: "open",
          dataForm: "matrix",
          groupId: "g1",
          chipTags: [],
        },
      ],
      fileGroups: [{ id: "g1", groupType: "single", memberFileIds: ["e1"], linkedGroupIds: [] }],
      notes: "",
    }

    const steps = deriveFlowSteps(submission)

    expect(servicesOf(steps)).toEqual(["bioproject", "biosample", "gea"])
    expect(steps.some((s) => s.service === "dra")).toBe(false)
  })

  test("deriveFlowSteps_ngsExpressionAndSequenceRead_unionsIntoSingleDraStep", () => {
    const submission: Submission = {
      preconditions: { q2: "human" },
      accessSection: { restrictedPreference: false, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: true, microbialAnalysis: false },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "sequence-read",
          access: "open",
          dataForm: "raw",
          groupId: "g1",
          chipTags: [],
        },
        {
          id: "e2",
          fileTypeKind: "expression-matrix",
          access: "open",
          dataForm: "matrix",
          groupId: "g2",
          chipTags: [{ axis: "expression-source", value: "ngs" }],
        },
      ],
      fileGroups: [
        { id: "g1", groupType: "single", memberFileIds: ["e1"], linkedGroupIds: [] },
        { id: "g2", groupType: "single", memberFileIds: ["e2"], linkedGroupIds: [] },
      ],
      notes: "",
    }

    const steps = deriveFlowSteps(submission)

    const dra = stepFor(steps, "dra")
    expect(dra.scope.entryIds).toEqual(["e1", "e2"])
  })

  test("deriveFlowSteps_disabledKindByQ2_isExcludedFromFlow", () => {
    const submission: Submission = {
      preconditions: { q2: null },
      accessSection: { restrictedPreference: false, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: false, microbialAnalysis: false },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "variant",
          access: "open",
          dataForm: "variant-call",
          groupId: "g1",
          chipTags: [],
        },
      ],
      fileGroups: [{ id: "g1", groupType: "single", memberFileIds: ["e1"], linkedGroupIds: [] }],
      notes: "",
    }

    expect(deriveFlowSteps(submission)).toEqual([])
  })

  test("deriveFlowSteps_emptySubmission_returnsNoSteps", () => {
    const submission: Submission = {
      preconditions: { q2: null },
      accessSection: { restrictedPreference: false, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: false, microbialAnalysis: false },
      fileEntries: [],
      fileGroups: [],
      notes: "",
    }

    expect(deriveFlowSteps(submission)).toEqual([])
  })
})
