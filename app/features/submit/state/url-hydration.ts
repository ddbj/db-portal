import type { SubmitUrlState } from "~/lib/submit-url"
import type { FileEntry, FileGroup, Submission } from "~/schemas/submit"
import { TYPICAL_DATA_FORM_FOR_KIND, TYPICAL_GROUP_TYPE_FOR_KIND } from "~/schemas/submit"
import type { AccessSection } from "~/schemas/submit/submission"

import { deriveAccess } from "../access"
import { initialState } from "./reducer"
import type { UIState } from "./types"

export const hydrateFromUrl = (urlState: SubmitUrlState): UIState => {
  const organismDomain = urlState.organismDomain
  const accessSection: AccessSection = urlState.accessSection ?? initialState.submission.accessSection

  let counter = 0
  const newId = (prefix: "e" | "g"): string => `hydrated-${prefix}-${counter++}`

  const explicitGroupIds: string[] = urlState.groups.map(() => newId("g"))
  const standaloneGroups: FileGroup[] = []
  const fileEntries: FileEntry[] = urlState.entries.map((ue) => {
    const entryId = newId("e")
    let groupId: string
    const resolved = ue.groupIndex !== null ? explicitGroupIds[ue.groupIndex] : undefined
    if (resolved !== undefined) {
      groupId = resolved
    } else {
      groupId = newId("g")
      standaloneGroups.push({
        id: groupId,
        groupType: TYPICAL_GROUP_TYPE_FOR_KIND[ue.fileTypeKind],
        memberFileIds: [entryId],
        linkedGroupIds: [],
      })
    }
    const access = deriveAccess(organismDomain, accessSection, ue.fileTypeKind, ue.chipTags)

    return {
      id: entryId,
      fileTypeKind: ue.fileTypeKind,
      access,
      dataForm: ue.dataForm ?? TYPICAL_DATA_FORM_FOR_KIND[ue.fileTypeKind],
      groupId,
      chipTags: ue.chipTags.map((c) => ({ axis: c.axis, value: c.value })),
    }
  })

  const explicitGroups: FileGroup[] = urlState.groups.map((ug, gi) => {
    const memberFileIds: string[] = []
    urlState.entries.forEach((ue, ei) => {
      const entry = fileEntries[ei]
      if (ue.groupIndex === gi && entry !== undefined) {
        memberFileIds.push(entry.id)
      }
    })
    const id = explicitGroupIds[gi] ?? newId("g")
    const linkedGroupIds: string[] = []
    for (const li of ug.linkedGroupIndices) {
      const linked = explicitGroupIds[li]
      if (linked !== undefined) linkedGroupIds.push(linked)
    }

    return {
      id,
      groupType: ug.groupType,
      memberFileIds,
      linkedGroupIds,
    }
  })
  const survivingExplicitGroups = explicitGroups.filter((g) => g.memberFileIds.length > 0)
  // Survived ID 集合に対して linkedGroupIds を再フィルタする。 そうしないと
  // member 不在で drop された group の ID が、 生き残った group の linkedGroupIds
  // に残って dangling 参照になる。
  const survivingIdSet = new Set(survivingExplicitGroups.map((g) => g.id))
  const sanitizedExplicitGroups: FileGroup[] = survivingExplicitGroups.map((g) => ({
    ...g,
    linkedGroupIds: g.linkedGroupIds.filter((id) => survivingIdSet.has(id)),
  }))
  const fileGroups: FileGroup[] = [
    ...sanitizedExplicitGroups,
    ...standaloneGroups,
  ]

  const submission: Submission = {
    preconditions: { organismDomain },
    accessSection,
    fileEntries,
    fileGroups,
    notes: "",
  }

  return { submission }
}

export const projectStateToUrl = (state: UIState): SubmitUrlState => {
  const { submission } = state
  const groupIndexById = new Map<string, number>()
  submission.fileGroups.forEach((g, i) => groupIndexById.set(g.id, i))

  const entries = submission.fileEntries.map((e) => ({
    fileTypeKind: e.fileTypeKind,
    dataForm: e.dataForm,
    groupIndex: groupIndexById.get(e.groupId) ?? null,
    chipTags: e.chipTags.map((c) => ({ axis: c.axis, value: c.value })),
  }))

  const groups = submission.fileGroups.map((g) => {
    const memberEntryIndices: number[] = []
    submission.fileEntries.forEach((e, ei) => {
      if (e.groupId === g.id) memberEntryIndices.push(ei)
    })
    const linkedGroupIndices: number[] = []
    for (const id of g.linkedGroupIds) {
      const idx = groupIndexById.get(id)
      if (idx !== undefined) linkedGroupIndices.push(idx)
    }

    return {
      groupType: g.groupType,
      memberEntryIndices,
      linkedGroupIndices,
    }
  })

  return {
    organismDomain: submission.preconditions.organismDomain,
    accessSection: submission.accessSection,
    entries,
    groups,
  }
}
