import type { ChipAxis, FileEntry, Organism, Submission } from "~/schemas/submit"

export type BioprojectAssignment = {
  bpId: string
  organism: Organism
  groupIds: readonly string[]
  entryIds: readonly string[]
}

export type FlowContext = {
  primaryBioprojectAssignments: readonly BioprojectAssignment[]
}

const hasChip = (
  entry: FileEntry,
  axis: ChipAxis,
  value?: string,
): boolean =>
  entry.chipTags.some((c) => c.axis === axis && (value === undefined || c.value === value))

export const entryHasChip = hasChip

const collectByOrganism = (
  submission: Submission,
): Map<Organism, { groupIds: Set<string>; entryIds: Set<string> }> => {
  const byOrg = new Map<Organism, { groupIds: Set<string>; entryIds: Set<string> }>()
  for (const e of submission.fileEntries) {
    const bucket = byOrg.get(e.organism) ?? { groupIds: new Set(), entryIds: new Set() }
    bucket.entryIds.add(e.id)
    bucket.groupIds.add(e.groupId)
    byOrg.set(e.organism, bucket)
  }
  return byOrg
}

export const deriveFlowContext = (submission: Submission): FlowContext => {
  const byOrg = collectByOrganism(submission)
  const primaryBioprojectAssignments: BioprojectAssignment[] = []
  for (const [organism, bucket] of byOrg) {
    primaryBioprojectAssignments.push({
      bpId: `bioproject:${organism}`,
      organism,
      groupIds: [...bucket.groupIds].sort(),
      entryIds: [...bucket.entryIds].sort(),
    })
  }
  primaryBioprojectAssignments.sort((a, b) => a.bpId.localeCompare(b.bpId))

  return { primaryBioprojectAssignments }
}
