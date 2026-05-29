import { getKindRoute } from "~/content/submit-routing/catalog"
import type { FileEntry, FlowStepNote, FlowStepScope, Service, Submission } from "~/schemas/submit"

import { evalWhen, type PredicateContext } from "./predicate"
import { groupMembers, groupOf, sortUnique } from "./shared"

// 薄インタプリタが 1 entry に KindRoute の rules を first-match 評価した結果
export type EntryRouting = {
  entry: FileEntry
  service: Service
  scope: FlowStepScope
  notes: FlowStepNote[]
}

export const routeEntry = (submission: Submission, entry: FileEntry): EntryRouting => {
  const route = getKindRoute(entry.fileTypeKind)
  const group = groupOf(submission, entry.groupId)
  const ctx: PredicateContext = {
    entry,
    group,
    q1: submission.preconditions.q1,
    q2: submission.preconditions.q2,
  }
  // 末尾の {always} fallback が必ずあるため find は常にマッチする
  const rule = route.rules.find((r) => evalWhen(r.when, ctx))
  if (rule === undefined) throw new Error(`no matching rule for "${entry.fileTypeKind}"`)

  const scope: FlowStepScope = rule.emit.scope === "group"
    ? {
      entryIds: sortUnique(groupMembers(submission, entry.groupId).map((e) => e.id)),
      groupIds: [entry.groupId],
    }
    : { entryIds: [entry.id], groupIds: [] }

  const notes = rule.emit.notes
    .filter((n) => n.whenAny === undefined || evalWhen(n.whenAny, ctx))
    .map((n) => ({ kind: n.kind, messageKey: n.messageKey }))

  return { entry, service: rule.emit.service, scope, notes }
}

export const routeEntries = (
  submission: Submission,
  entries: readonly FileEntry[],
): EntryRouting[] => entries.map((e) => routeEntry(submission, e))
