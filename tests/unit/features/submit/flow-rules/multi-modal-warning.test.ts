import { describe, expect, test } from "vitest"

import { deriveFlowSteps } from "~/features/submit/flow-rules"
import type { FileEntry, FileGroup, FlowStep, Q1, Q2, Submission } from "~/schemas/submit"
import { isDestinationService } from "~/schemas/submit"

const MULTI_MODAL_WARNING = "submit.multiModal.warning"

const makeSubmission = (
  q1: Q1 | null,
  q2: Q2 | null,
  groups: readonly FileGroup[],
  entries: readonly FileEntry[],
): Submission => ({
  preconditions: { q1, q2 },
  fileGroups: [...groups],
  fileEntries: [...entries],
  notes: "",
})

const warningCount = (step: FlowStep): number =>
  step.notes.filter((n) => n.kind === "warning" && n.messageKey === MULTI_MODAL_WARNING).length

const stepsWithMultiModalWarning = (steps: readonly FlowStep[]): FlowStep[] =>
  steps.filter((s) => warningCount(s) > 0)

describe("deriveFlowSteps multi-modal warning", () => {
  test("deriveFlowSteps_singleGroupMixesVariantAndExpression_warnsOnEveryDestinationStep", () => {
    // public/human variant -> togovar (destination), expression-matrix -> gea (destination),
    // both living in one ordinary `single` group: two distinct kinds trip the multi-modal guard
    const submission = makeSubmission(
      "public",
      "human",
      [{ id: "g1", groupType: "single", memberFileIds: ["e-var", "e-mtx"], linkedGroupIds: [] }],
      [
        {
          id: "e-var",
          fileTypeKind: "variant",
          filename: "var.vcf",
          access: "open",
          dataForm: "variant-call",
          groupId: "g1",
          chipTags: [],
        },
        {
          id: "e-mtx",
          fileTypeKind: "expression-matrix",
          filename: "mtx.tsv",
          access: "open",
          dataForm: "matrix",
          groupId: "g1",
          chipTags: [],
        },
      ],
    )

    const steps = deriveFlowSteps(submission)

    const togovar = steps.find((s) => s.service === "togovar")
    const gea = steps.find((s) => s.service === "gea")
    expect(togovar).toBeDefined()
    expect(gea).toBeDefined()

    // every destination touching the mixed group carries exactly one multi-modal warning
    expect(warningCount(togovar!)).toBe(1)
    expect(warningCount(gea!)).toBe(1)
  })

  test("deriveFlowSteps_mixedGroup_doesNotWarnOnCompanionOrExternalSteps", () => {
    // restricted/human sequence-read -> jga (destination via recipe) + humandbs (external gate);
    // an open expression-matrix in the same group makes it multi-modal and adds gea (destination)
    const submission = makeSubmission(
      "restricted",
      "human",
      [{ id: "g1", groupType: "single", memberFileIds: ["e-read", "e-mtx"], linkedGroupIds: [] }],
      [
        {
          id: "e-read",
          fileTypeKind: "sequence-read",
          filename: "read.fastq",
          access: "restricted",
          dataForm: "raw",
          groupId: "g1",
          chipTags: [],
        },
        {
          id: "e-mtx",
          fileTypeKind: "expression-matrix",
          filename: "mtx.tsv",
          access: "open",
          dataForm: "matrix",
          groupId: "g1",
          chipTags: [],
        },
      ],
    )

    const steps = deriveFlowSteps(submission)

    // companion (bioproject/biosample) and external (humandbs) services never receive the warning,
    // even though they share the mixed group's scope
    const nonDestinationWarnings = steps
      .filter((s) => !isDestinationService(s.service))
      .map((s) => warningCount(s))
    expect(nonDestinationWarnings.every((c) => c === 0)).toBe(true)

    // the warning still lands on at least one destination so the guard is not vacuously silent
    const warned = stepsWithMultiModalWarning(steps)
    expect(warned.length).toBeGreaterThan(0)
    expect(warned.every((s) => isDestinationService(s.service))).toBe(true)
  })

  test("deriveFlowSteps_singleKindGroup_emitsNoMultiModalWarning", () => {
    // one kind only: kinds.size < 2, so no group is considered mixed
    const submission = makeSubmission(
      "public",
      "eukaryote",
      [{ id: "g1", groupType: "single", memberFileIds: ["e1", "e2"], linkedGroupIds: [] }],
      [
        {
          id: "e1",
          fileTypeKind: "variant",
          filename: "a.vcf",
          access: "open",
          dataForm: "variant-call",
          groupId: "g1",
          chipTags: [],
        },
        {
          id: "e2",
          fileTypeKind: "variant",
          filename: "b.vcf",
          access: "open",
          dataForm: "variant-call",
          groupId: "g1",
          chipTags: [],
        },
      ],
    )

    const steps = deriveFlowSteps(submission)

    expect(stepsWithMultiModalWarning(steps)).toEqual([])
  })

  test("deriveFlowSteps_mixedKindsAcrossSeparateGroups_emitsNoMultiModalWarning", () => {
    // distinct kinds but each in its own single-kind group: no single group mixes kinds
    const submission = makeSubmission(
      "public",
      "human",
      [
        { id: "g1", groupType: "single", memberFileIds: ["e-var"], linkedGroupIds: [] },
        { id: "g2", groupType: "single", memberFileIds: ["e-mtx"], linkedGroupIds: [] },
      ],
      [
        {
          id: "e-var",
          fileTypeKind: "variant",
          filename: "var.vcf",
          access: "open",
          dataForm: "variant-call",
          groupId: "g1",
          chipTags: [],
        },
        {
          id: "e-mtx",
          fileTypeKind: "expression-matrix",
          filename: "mtx.tsv",
          access: "open",
          dataForm: "matrix",
          groupId: "g2",
          chipTags: [],
        },
      ],
    )

    const steps = deriveFlowSteps(submission)

    expect(stepsWithMultiModalWarning(steps)).toEqual([])
  })

  test("deriveFlowSteps_assemblyAnnotationPair_suppressesMultiModalWarning", () => {
    // assembly + annotation are intentionally a two-kind group; the guard excludes it
    const submission = makeSubmission(
      "public",
      "eukaryote",
      [
        {
          id: "g1",
          groupType: "assembly-annotation",
          memberFileIds: ["e-seq", "e-ann"],
          linkedGroupIds: [],
        },
      ],
      [
        {
          id: "e-seq",
          fileTypeKind: "sequence-nucleotide",
          filename: "asm.fasta",
          access: "open",
          dataForm: "assembled",
          groupId: "g1",
          chipTags: [],
        },
        {
          id: "e-ann",
          fileTypeKind: "sequence-annotation",
          filename: "asm.gff",
          access: "open",
          dataForm: "annotation",
          groupId: "g1",
          chipTags: [],
        },
      ],
    )

    const steps = deriveFlowSteps(submission)

    // both entries route to ddbj-trad (a destination), so without the exclusion they would warn
    expect(steps.some((s) => s.service === "ddbj-trad")).toBe(true)
    expect(stepsWithMultiModalWarning(steps)).toEqual([])
  })

  test("deriveFlowSteps_magSagChainRecipe_suppressesMultiModalWarning", () => {
    // mag-sag-chain bundles a raw read (-> dra) and a mag assembly (-> ddbj-trad): two kinds,
    // but the named recipe owns the group and the guard excludes its group type
    const submission = makeSubmission(
      "public",
      "metagenome",
      [
        {
          id: "g1",
          groupType: "mag-sag-chain",
          memberFileIds: ["raw1", "mag1"],
          linkedGroupIds: [],
        },
      ],
      [
        {
          id: "raw1",
          fileTypeKind: "sequence-read",
          filename: "read.fastq",
          access: "open",
          dataForm: "raw",
          groupId: "g1",
          chipTags: [{ axis: "assembly-form", value: "raw" }],
        },
        {
          id: "mag1",
          fileTypeKind: "sequence-nucleotide",
          filename: "mag.fasta",
          access: "open",
          dataForm: "assembled",
          groupId: "g1",
          chipTags: [{ axis: "assembly-form", value: "mag" }],
        },
      ],
    )

    const steps = deriveFlowSteps(submission)

    // recipe really does emit destination steps over this two-kind group
    expect(steps.some((s) => isDestinationService(s.service))).toBe(true)
    expect(steps.some((s) => s.service === "dra")).toBe(true)
    expect(steps.some((s) => s.service === "ddbj-trad")).toBe(true)
    expect(stepsWithMultiModalWarning(steps)).toEqual([])
  })

  test("deriveFlowSteps_jgaDatasetWithMixedKinds_suppressesMultiModalWarning", () => {
    // restricted/human sequence-read + variant both route to jga inside a jga-dataset group:
    // two kinds, but the dataset group type is an intentional multi-kind bundle
    const submission = makeSubmission(
      "restricted",
      "human",
      [
        {
          id: "g1",
          groupType: "jga-dataset",
          memberFileIds: ["e-read", "e-var"],
          linkedGroupIds: [],
        },
      ],
      [
        {
          id: "e-read",
          fileTypeKind: "sequence-read",
          filename: "read.fastq",
          access: "restricted",
          dataForm: "raw",
          groupId: "g1",
          chipTags: [],
        },
        {
          id: "e-var",
          fileTypeKind: "variant",
          filename: "var.vcf",
          access: "restricted",
          dataForm: "variant-call",
          groupId: "g1",
          chipTags: [],
        },
      ],
    )

    const steps = deriveFlowSteps(submission)

    // the dataset is a real jga destination, so suppression is meaningful here
    expect(steps.some((s) => s.service === "jga")).toBe(true)
    expect(stepsWithMultiModalWarning(steps)).toEqual([])
  })

  test("deriveFlowSteps_threeDistinctKindsInOneGroup_warnsExactlyOncePerDestination", () => {
    // three kinds in one ordinary group: kinds.size = 3 still trips the guard, and the
    // warning is deduped to a single instance on each destination it touches
    const submission = makeSubmission(
      "public",
      "human",
      [
        {
          id: "g1",
          groupType: "single",
          memberFileIds: ["e-var", "e-mtx", "e-ms"],
          linkedGroupIds: [],
        },
      ],
      [
        {
          id: "e-var",
          fileTypeKind: "variant",
          filename: "var.vcf",
          access: "open",
          dataForm: "variant-call",
          groupId: "g1",
          chipTags: [],
        },
        {
          id: "e-mtx",
          fileTypeKind: "expression-matrix",
          filename: "mtx.tsv",
          access: "open",
          dataForm: "matrix",
          groupId: "g1",
          chipTags: [],
        },
        {
          id: "e-ms",
          fileTypeKind: "mass-spectrometry",
          filename: "ms.mzML",
          access: "open",
          dataForm: "spectrum",
          groupId: "g1",
          chipTags: [{ axis: "mass-spec-domain", value: "metabolomics" }],
        },
      ],
    )

    const steps = deriveFlowSteps(submission)

    const warned = stepsWithMultiModalWarning(steps)
    expect(warned.length).toBeGreaterThan(0)
    // never more than one multi-modal warning per step regardless of how many kinds mix
    for (const s of warned) {
      expect(warningCount(s)).toBe(1)
    }
  })
})
