import { describe, expect, test } from "vitest"

import { deriveFlowSteps } from "~/features/submit/flow-rules"
import type { FileEntry, FileGroup, FlowStep, Submission } from "~/schemas/submit"

const servicesOf = (steps: readonly FlowStep[]): string[] => steps.map((s) => s.service)

const destinationOf = (steps: readonly FlowStep[]): FlowStep => {
  const dests = steps.filter((s) => s.service === "ddbj" || s.service === "nsss")
  expect(dests).toHaveLength(1)

  return dests[0]!
}

const defaultAccessSection = {
  restrictedPreference: false,
  hasIdentifier: false,
  ethicsCompliance: false,
  publiclyAvailable: false,
  microbialAnalysis: false,
}

const GENE = { axis: "assembly-form", value: "gene" } as const
const GENOME = { axis: "assembly-form", value: "genome" } as const
const ANNOTATED = { axis: "has-annotation", value: "true" } as const
const SMALL_SCALE = { axis: "small-scale", value: "true" } as const
const TPA = { axis: "tpa", value: "true" } as const

const singleSequence = (
  preconditions: Submission["preconditions"],
  overrides: Partial<FileEntry> = {},
): Submission => {
  const entry: FileEntry = {
    id: "e1",
    fileTypeKind: "sequence",
    access: "open",
    dataForm: "assembled",
    groupId: "g1",
    chipTags: [],
    ...overrides,
  }
  const group: FileGroup = { id: "g1", groupType: "single", memberFileIds: ["e1"], linkedGroupIds: [] }

  return { preconditions, accessSection: defaultAccessSection, fileEntries: [entry], fileGroups: [group], notes: "" }
}

describe("MSS/NSSS split", () => {
  test("deriveFlowSteps_defaultSequence_routesToDdbj", () => {
    const steps = deriveFlowSteps(singleSequence({ organismDomain: "eukaryote" }))

    expect(servicesOf(steps)).toEqual(["bioproject", "biosample", "ddbj"])

    const dest = destinationOf(steps)
    expect(dest.service).toBe("ddbj")
    expect(dest.origin).toBe("tier1")
    expect(dest.notes.map((n) => n.messageKey)).toContain("submit.ddbj.mss.intro")
    expect(steps.some((s) => s.service === "nsss")).toBe(false)
  })

  test("deriveFlowSteps_geneSmallScale_routesToNsssWithoutBioprojectOrBiosample", () => {
    const steps = deriveFlowSteps(
      singleSequence({ organismDomain: "eukaryote" }, { chipTags: [GENE, ANNOTATED, SMALL_SCALE] }),
    )

    expect(servicesOf(steps)).toEqual(["nsss"])

    const dest = destinationOf(steps)
    expect(dest.service).toBe("nsss")
    expect(dest.origin).toBe("tier1")
    expect(dest.notes.map((n) => n.messageKey)).toContain("submit.nsss.intro")
    expect(steps.some((s) => s.service === "ddbj")).toBe(false)
  })

  test("deriveFlowSteps_geneSmallScale_warnsThatBioprojectOrBiosampleRequiresMss", () => {
    const dest = destinationOf(
      deriveFlowSteps(
        singleSequence({ organismDomain: "eukaryote" }, { chipTags: [GENE, ANNOTATED, SMALL_SCALE] }),
      ),
    )

    expect(dest.notes).toContainEqual({ kind: "warning", messageKey: "submit.nsss.bioprojectBiosampleToMss" })
  })

  test("deriveFlowSteps_nsssMixedWithMss_scopesCompanionsToTheMssEntryOnly", () => {
    const submission: Submission = {
      preconditions: { organismDomain: "eukaryote" },
      accessSection: defaultAccessSection,
      fileEntries: [
        { id: "small", fileTypeKind: "sequence", access: "open", dataForm: "assembled", groupId: "g1", chipTags: [GENE, ANNOTATED, SMALL_SCALE] },
        { id: "large", fileTypeKind: "sequence", access: "open", dataForm: "assembled", groupId: "g2", chipTags: [] },
      ],
      fileGroups: [
        { id: "g1", groupType: "single", memberFileIds: ["small"], linkedGroupIds: [] },
        { id: "g2", groupType: "single", memberFileIds: ["large"], linkedGroupIds: [] },
      ],
      notes: "",
    }

    const steps = deriveFlowSteps(submission)

    expect(servicesOf(steps)).toEqual(["bioproject", "biosample", "ddbj", "nsss"])
    for (const companion of steps.filter((s) => s.service === "bioproject" || s.service === "biosample")) {
      expect(companion.scope.entryIds).toEqual(["large"])
    }
  })

  test("deriveFlowSteps_mssWithoutSmallScale_keepsBioprojectAndBiosampleAndNoNsssWarning", () => {
    const steps = deriveFlowSteps(singleSequence({ organismDomain: "eukaryote" }))

    expect(servicesOf(steps)).toEqual(["bioproject", "biosample", "ddbj"])
    expect(destinationOf(steps).notes.map((n) => n.messageKey)).not.toContain("submit.nsss.bioprojectBiosampleToMss")
  })

  test("deriveFlowSteps_sequenceWithTpaChip_routesToDdbjNotNsss", () => {
    const steps = deriveFlowSteps(
      singleSequence({ organismDomain: "eukaryote" }, { chipTags: [{ axis: "tpa", value: "true" }] }),
    )

    expect(servicesOf(steps)).toEqual(["bioproject", "biosample", "ddbj"])

    const dest = destinationOf(steps)
    expect(dest.service).toBe("ddbj")
    expect(dest.origin).toBe("tier1")
    expect(dest.notes.map((n) => n.messageKey)).toContain(
      "submit.ddbj.tpa.primaryAccessionRequired",
    )
    expect(steps.some((s) => s.service === "nsss")).toBe(false)
  })

  test("deriveFlowSteps_magCompletedGenomeChain_routesToDdbjNotNsss", () => {
    const submission: Submission = {
      preconditions: { organismDomain: "metagenome" },
      accessSection: defaultAccessSection,
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
          fileTypeKind: "sequence",
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
    expect(steps.some((s) => s.service === "nsss")).toBe(false)
  })

  test("deriveFlowSteps_nsssVsDdbjBoundary_doesNotCollapseOntoOneService", () => {
    const ddbjDest = destinationOf(
      deriveFlowSteps(singleSequence({ organismDomain: "eukaryote" })),
    )
    const nsssDest = destinationOf(
      deriveFlowSteps(
        singleSequence({ organismDomain: "eukaryote" }, { chipTags: [GENE, ANNOTATED, SMALL_SCALE] }),
      ),
    )

    expect(ddbjDest.service).toBe("ddbj")
    expect(nsssDest.service).toBe("nsss")
    expect(ddbjDest.service).not.toBe(nsssDest.service)
  })

  test("deriveFlowSteps_geneWithoutSmallScale_routesToMssWithoutBioprojectOrBiosample", () => {
    const steps = deriveFlowSteps(singleSequence({ organismDomain: "prokaryote" }, { chipTags: [GENE, ANNOTATED] }))

    expect(servicesOf(steps)).toEqual(["ddbj"])
    expect(destinationOf(steps).notes).toContainEqual({
      kind: "warning",
      messageKey: "submit.ddbj.gene.bioprojectBiosampleOptional",
    })
  })

  test("deriveFlowSteps_geneWithoutAnnotation_routesToMssWithoutBioprojectOrBiosample", () => {
    const steps = deriveFlowSteps(singleSequence({ organismDomain: "prokaryote" }, { chipTags: [GENE] }))

    expect(servicesOf(steps)).toEqual(["ddbj"])
  })

  test("deriveFlowSteps_genomeWithSmallScale_routesToMssWithBioprojectAndBiosample", () => {
    const steps = deriveFlowSteps(
      singleSequence({ organismDomain: "prokaryote" }, { chipTags: [GENOME, ANNOTATED, SMALL_SCALE] }),
    )

    expect(servicesOf(steps)).toEqual(["bioproject", "biosample", "ddbj"])
    expect(destinationOf(steps).notes.map((n) => n.messageKey)).toContain("submit.ddbj.mss.intro")
  })

  test("deriveFlowSteps_geneWithTpa_routesToTpaWithBioprojectAndBiosample", () => {
    const steps = deriveFlowSteps(singleSequence({ organismDomain: "prokaryote" }, { chipTags: [GENE, ANNOTATED, TPA] }))

    expect(servicesOf(steps)).toEqual(["bioproject", "biosample", "ddbj"])
    expect(destinationOf(steps).notes.map((n) => n.messageKey)).toContain("submit.ddbj.tpa.intro")
  })

  test("deriveFlowSteps_geneMixedWithGenome_scopesCompanionsToTheGenomeEntryOnly", () => {
    const submission: Submission = {
      preconditions: { organismDomain: "prokaryote" },
      accessSection: defaultAccessSection,
      fileEntries: [
        { id: "gene", fileTypeKind: "sequence", access: "open", dataForm: "assembled", groupId: "g1", chipTags: [GENE, ANNOTATED] },
        { id: "genome", fileTypeKind: "sequence", access: "open", dataForm: "assembled", groupId: "g2", chipTags: [GENOME, ANNOTATED] },
      ],
      fileGroups: [
        { id: "g1", groupType: "single", memberFileIds: ["gene"], linkedGroupIds: [] },
        { id: "g2", groupType: "single", memberFileIds: ["genome"], linkedGroupIds: [] },
      ],
      notes: "",
    }

    const steps = deriveFlowSteps(submission)

    expect(servicesOf(steps)).toEqual(["bioproject", "biosample", "ddbj"])
    expect(destinationOf(steps).scope.entryIds).toEqual(["gene", "genome"])
    for (const companion of steps.filter((s) => s.service === "bioproject" || s.service === "biosample")) {
      expect(companion.scope.entryIds).toEqual(["genome"])
    }
  })
})
