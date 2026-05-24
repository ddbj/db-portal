import type { ButtonType, FileEntry, FileGroup, FlowStepScope, Submission } from "~/schemas/submit"

export const buildScope = (entries: readonly FileEntry[]): FlowStepScope => {
  const entryIds = [...new Set(entries.map((e) => e.id))].sort()
  const groupIds = [...new Set(entries.map((e) => e.groupId))].sort()
  return { entryIds, groupIds }
}

export const isNonEmptyScope = (scope: FlowStepScope): boolean =>
  scope.entryIds.length > 0 || scope.groupIds.length > 0

export const buttonTypeIs = (
  entry: FileEntry,
  ...types: readonly ButtonType[]
): boolean => types.includes(entry.buttonType)

export const isRestrictedHuman = (entry: FileEntry): boolean =>
  entry.access === "restricted" && entry.organism === "human"

export const groupTypeOf = (
  submission: Submission,
  groupId: string,
): FileGroup["groupType"] | undefined =>
  submission.fileGroups.find((g) => g.id === groupId)?.groupType

export const entriesByGroup = (
  submission: Submission,
): Map<string, FileEntry[]> => {
  const m = new Map<string, FileEntry[]>()
  for (const e of submission.fileEntries) {
    const bucket = m.get(e.groupId) ?? []
    bucket.push(e)
    m.set(e.groupId, bucket)
  }
  return m
}
