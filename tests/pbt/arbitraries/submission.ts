import { fc } from "@fast-check/vitest"

import type {
  Access,
  ButtonType,
  ChipAxis,
  DataForm,
  FileEntry,
  FileGroup,
  GroupType,
  Organism,
  Submission,
} from "../../../app/schemas/submit"

const buttonTypes: readonly ButtonType[] = [
  "sequence-read",
  "assembled",
  "gene-annotation",
  "variation",
  "phenotype",
  "microarray-expression",
  "rna-seq-matrix",
  "mass-spec",
  "spatial-tx",
]

const groupTypes: readonly GroupType[] = [
  "single",
  "pair-end",
  "10x",
  "multiplex",
  "two-color",
  "mage-tab",
  "hybrid",
  "imaging-ms",
  "variation-with-reference",
  "mag-sag-chain",
  "jga-dataset",
  "pacbio-hdf5",
  "assembly-annotation",
]

const organisms: readonly Organism[] = [
  "human",
  "human-microbiome",
  "eukaryote",
  "prokaryote",
  "virus",
  "metagenome",
  "organelle-plasmid",
]

const accesses: readonly Access[] = ["open", "restricted"]

const dataForms: readonly DataForm[] = [
  "raw",
  "assembled",
  "analysis-output",
  "matrix",
  "annotation",
  "mass-spec",
  "phenotype",
]

const chipAxes: readonly ChipAxis[] = [
  "assembly-form",
  "provenance",
  "variation-form",
  "host-pathogen",
  "haplotype-mode",
  "functional-genomics",
  "mass-spec-domain",
  "spatial-platform",
  "tpa-subtype",
  "mag-sag-chain",
]

const chipValues: readonly string[] = [
  "third-party",
  "phased",
  "raw",
  "primary",
  "binned",
  "mag",
  "sag",
  "hybrid",
  "proteomics",
  "metabolomics",
  "rna-seq",
  "chip-seq",
  "visium",
  "stereo-seq",
  "per-sample",
  "aggregate",
  "tpa",
]

export const arbButtonType = fc.constantFrom(...buttonTypes)
export const arbGroupType = fc.constantFrom(...groupTypes)
export const arbOrganism = fc.constantFrom(...organisms)
export const arbAccess = fc.constantFrom(...accesses)
export const arbDataForm = fc.constantFrom(...dataForms)
export const arbChipAxis = fc.constantFrom(...chipAxes)

export const arbChipTag = fc.record({
  axis: arbChipAxis,
  value: fc.constantFrom(...chipValues),
})

type EntryShape = {
  buttonType: ButtonType
  filename: string
  organism: Organism
  access: Access
  dataForm: DataForm
  groupIdx: number
  chipTags: { axis: ChipAxis; value: string }[]
}

type SubmissionShape = {
  groupTypes: GroupType[]
  entries: EntryShape[]
}

const arbSubmissionShape: fc.Arbitrary<SubmissionShape> = fc.record({
  groupTypes: fc.array(arbGroupType, { minLength: 0, maxLength: 5 }),
  entries: fc.array(
    fc.record({
      buttonType: arbButtonType,
      filename: fc.string({ minLength: 0, maxLength: 24 }),
      organism: arbOrganism,
      access: arbAccess,
      dataForm: arbDataForm,
      groupIdx: fc.integer({ min: 0, max: 6 }),
      chipTags: fc.array(arbChipTag, { minLength: 0, maxLength: 3 }),
    }),
    { minLength: 0, maxLength: 10 },
  ),
})

const groupIdOf = (i: number): string => `g${i}`
const entryIdOf = (i: number): string => `e${i}`
const ORPHAN_GROUP_ID = "g-orphan"

export const arbSubmission: fc.Arbitrary<Submission> = arbSubmissionShape.map(
  ({ groupTypes: gts, entries }): Submission => {
    const fileGroups: FileGroup[] = gts.map((gt, i) => ({
      id: groupIdOf(i),
      groupType: gt,
      memberFileIds: [],
      linkedGroupIds: [],
    }))

    const fileEntries: FileEntry[] = entries.map((e, i) => {
      const groupId = fileGroups.length === 0
        ? ORPHAN_GROUP_ID
        : fileGroups[e.groupIdx % fileGroups.length]!.id
      return {
        id: entryIdOf(i),
        buttonType: e.buttonType,
        filename: e.filename,
        organism: e.organism,
        access: e.access,
        dataForm: e.dataForm,
        groupId,
        chipTags: e.chipTags,
      }
    })

    const byGroup = new Map<string, string[]>()
    for (const e of fileEntries) {
      const arr = byGroup.get(e.groupId) ?? []
      arr.push(e.id)
      byGroup.set(e.groupId, arr)
    }
    for (const g of fileGroups) {
      g.memberFileIds = byGroup.get(g.id) ?? []
    }

    return { fileEntries, fileGroups, notes: "" }
  },
)
