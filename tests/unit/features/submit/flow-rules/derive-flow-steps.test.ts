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
      preconditions: { q1: "public", q2: "human" },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "sequence-read",
          filename: "read_001.fastq",
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
      preconditions: { q1: "restricted", q2: "human" },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "sequence-read",
          filename: "read_001.fastq",
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

    // JGA dataset plus the policy/NBDC externals, with the default bioproject/biosample suppressed
    expect(servicesOf(steps)).toEqual(["jga", "humandbs", "dbcls"])
    expect(steps.some((s) => s.service === "bioproject")).toBe(false)
    expect(steps.some((s) => s.service === "biosample")).toBe(false)

    const jga = stepFor(steps, "jga")
    expect(jga.origin).toBe("recipe")
    expect(jga.scope.entryIds).toEqual(["e1"])

    expect(stepFor(steps, "humandbs").origin).toBe("recipe")
    expect(stepFor(steps, "dbcls").origin).toBe("recipe")
  })

  test("deriveFlowSteps_thirdPartySequenceNucleotide_routesToDdbjTradWithTpaWarning", () => {
    const submission: Submission = {
      preconditions: { q1: "third-party", q2: "eukaryote" },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "sequence-nucleotide",
          filename: "seq_001.fasta",
          access: "open",
          dataForm: "assembled",
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

    expect(servicesOf(steps)).toEqual(["bioproject", "biosample", "ddbj-trad"])

    const trad = stepFor(steps, "ddbj-trad")
    expect(trad.origin).toBe("tier1")
    expect(trad.scope.entryIds).toEqual(["e1"])
    // TPA branch carries the primary-accession warning
    expect(warningKeys(trad)).toContain("submit.ddbjTrad.tpa.primaryAccessionRequired")
  })

  test("deriveFlowSteps_nonHumanVariant_routesToTogovarWithHumanRefOnlyWarning", () => {
    const submission: Submission = {
      preconditions: { q1: "public", q2: "eukaryote" },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "variant",
          filename: "var_001.vcf",
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

    expect(servicesOf(steps)).toEqual(["bioproject", "biosample", "togovar"])

    const togovar = stepFor(steps, "togovar")
    expect(togovar.origin).toBe("tier1")
    // eukaryote is non-human, so the human-reference-only caveat fires
    expect(warningKeys(togovar)).toContain("submit.variant.togovar.humanRefOnly")
    expect(steps.some((s) => s.service === "jga")).toBe(false)
  })

  test("deriveFlowSteps_restrictedHumanVariant_routesToJgaWithoutTogovarWarning", () => {
    const submission: Submission = {
      preconditions: { q1: "restricted", q2: "human" },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "variant",
          filename: "var_001.vcf",
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

    expect(servicesOf(steps)).toEqual(["jga", "humandbs", "dbcls"])
    expect(steps.some((s) => s.service === "togovar")).toBe(false)
    const jga = stepFor(steps, "jga")
    expect(jga.origin).toBe("recipe")
    expect(warningKeys(jga)).not.toContain("submit.variant.togovar.humanRefOnly")
  })

  test("deriveFlowSteps_publicMetagenomeVariant_routesToTogovarWithHumanRefOnlyWarning", () => {
    const submission: Submission = {
      preconditions: { q1: "public", q2: "metagenome" },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "variant",
          filename: "var_001.vcf",
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

    expect(servicesOf(steps)).toEqual(["bioproject", "biosample", "togovar"])
    // metagenome is non-human, so the GRCh37/38 human-reference-only caveat fires
    expect(warningKeys(stepFor(steps, "togovar"))).toContain("submit.variant.togovar.humanRefOnly")
  })

  test("deriveFlowSteps_restrictedMetagenomeVariant_routesToJga", () => {
    const submission: Submission = {
      preconditions: { q1: "restricted", q2: "metagenome" },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "variant",
          filename: "var_001.vcf",
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

    expect(steps.some((s) => s.service === "jga")).toBe(true)
    expect(steps.some((s) => s.service === "togovar")).toBe(false)
  })

  test("deriveFlowSteps_magSagChainWithMagChip_emitsRecipeOriginSteps", () => {
    const submission: Submission = {
      preconditions: { q1: "public", q2: "metagenome" },
      fileEntries: [
        {
          id: "raw1",
          fileTypeKind: "sequence-read",
          filename: "read_001.fastq",
          access: "open",
          dataForm: "raw",
          groupId: "g1",
          chipTags: [{ axis: "assembly-form", value: "raw" }],
        },
        {
          id: "mag1",
          fileTypeKind: "sequence-nucleotide",
          filename: "seq_001.fasta",
          access: "open",
          dataForm: "assembled",
          groupId: "g1",
          chipTags: [{ axis: "assembly-form", value: "mag" }],
        },
      ],
      fileGroups: [
        {
          id: "g1",
          groupType: "mag-sag-chain",
          memberFileIds: ["raw1", "mag1"],
          linkedGroupIds: [],
        },
      ],
      notes: "",
    }

    const steps = deriveFlowSteps(submission)

    // every step originates from the named mag-project recipe, not tier1/tier2
    expect(steps.every((s) => s.origin === "recipe")).toBe(true)
    // recipe bypasses the interpreter, so no default bioproject/biosample pair leaks in
    expect(steps.some((s) => s.id === "tier2-bioproject")).toBe(false)
    expect(steps.some((s) => s.id === "tier2-biosample")).toBe(false)

    expect(steps.filter((s) => s.service === "bioproject")).toHaveLength(1)
    // the recipe fans biosample into metagenome / binned / mag rows
    expect(steps.filter((s) => s.service === "biosample").length).toBeGreaterThan(1)
    expect(steps.some((s) => s.service === "dra")).toBe(true)
    expect(steps.some((s) => s.service === "ddbj-trad")).toBe(true)

    // raw read goes to a DRA run; the MAG assembly goes to ddbj-trad
    const draRun = steps.find((s) => s.service === "dra")!
    expect(draRun.scope.entryIds).toEqual(["raw1"])
    const trad = stepFor(steps, "ddbj-trad")
    expect(trad.scope.entryIds).toEqual(["mag1"])
  })

  test("deriveFlowSteps_emptySubmission_returnsNoSteps", () => {
    const submission: Submission = {
      preconditions: { q1: null, q2: null },
      fileEntries: [],
      fileGroups: [],
      notes: "",
    }

    expect(deriveFlowSteps(submission)).toEqual([])
  })
})
