import type {
  ChipAxis,
  FileEntry,
  FileGroup,
  FlowStep,
  FlowStepNote,
  FlowStepOrigin,
  FlowStepScope,
  Service,
  Submission,
} from "~/schemas/submit"

export const hasChip = (entry: FileEntry, axis: ChipAxis, value?: string): boolean =>
  entry.chipTags.some((c) => c.axis === axis && (value === undefined || c.value === value))

export const groupOf = (submission: Submission, groupId: string): FileGroup | undefined =>
  submission.fileGroups.find((g) => g.id === groupId)

export const groupMembers = (submission: Submission, groupId: string): FileEntry[] =>
  submission.fileEntries.filter((e) => e.groupId === groupId)

export const sortUnique = (xs: readonly string[]): string[] => [...new Set(xs)].sort()

export const mergeScopes = (scopes: readonly FlowStepScope[]): FlowStepScope => ({
  entryIds: sortUnique(scopes.flatMap((s) => s.entryIds)),
  groupIds: sortUnique(scopes.flatMap((s) => s.groupIds)),
})

export const isNonEmptyScope = (scope: FlowStepScope): boolean =>
  scope.entryIds.length > 0 || scope.groupIds.length > 0

export const dedupeNotes = (notes: readonly FlowStepNote[]): FlowStepNote[] => {
  const seen = new Set<string>()
  const out: FlowStepNote[] = []
  for (const n of notes) {
    const key = `${n.kind}:${n.messageKey}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(n)
  }

  return out
}

export const makeStep = (
  id: string,
  service: Service,
  origin: FlowStepOrigin,
  scope: FlowStepScope,
  notes: readonly FlowStepNote[],
): FlowStep => ({ id, service, origin, scope, notes: dedupeNotes(notes) })

export const scopeOfEntries = (entries: readonly FileEntry[]): FlowStepScope => ({
  entryIds: sortUnique(entries.map((e) => e.id)),
  groupIds: sortUnique(entries.map((e) => e.groupId)),
})
