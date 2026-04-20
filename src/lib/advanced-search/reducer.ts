import {
  findField,
  isFieldAvailableForDb,
} from "@/lib/mock-data/advanced-search-fields"
import type { DbSelectValue } from "@/lib/search-url"
import { ALL_DB_VALUE } from "@/lib/search-url"
import type { AdvancedCondition, FieldOperator } from "@/types/search"

import {
  addConditionAt,
  addGroupAt,
  createEmptyRoot,
  removeAt,
  setGroupLogicAt,
  updateConditionAt,
  walkTree,
} from "./tree"
import type {
  AdvancedGroupNode,
  AdvancedNodeWithId,
  AdvancedSearchAction,
  AdvancedSearchState,
} from "./types"

const DEFAULT_FIELD_ID = "title"

const TRAD_COERCIBLE_DATE_FIELDS: ReadonlySet<string> = new Set([
  "date_modified",
  "date_created",
  "date",
])

const resetValueForOperator = (
  operator: FieldOperator,
): AdvancedCondition["value"] => {
  if (operator === "between") return { from: "", to: "" }

  return ""
}

const buildDefaultCondition = (fieldId: string): AdvancedCondition => {
  const field = findField(fieldId) ?? findField(DEFAULT_FIELD_ID)
  const resolvedField = field ?? {
    id: DEFAULT_FIELD_ID,
    availableOps: ["equals"] as const,
  }
  const operator = (resolvedField.availableOps[0] ?? "equals") as FieldOperator

  return {
    field: resolvedField.id,
    operator,
    value: resetValueForOperator(operator),
  }
}

const collectRemovableIds = (
  tree: AdvancedGroupNode,
  nextDb: DbSelectValue,
): readonly string[] => {
  const ids: string[] = []
  walkTree(tree).forEach((entry) => {
    if (entry.node.kind !== "condition") return
    const field = findField(entry.node.condition.field)
    if (!field || field.tier !== 3) return
    if (!isFieldAvailableForDb(field.id, nextDb)) {
      ids.push(entry.node.id)
    }
  })

  return ids
}

const pruneInNode = (
  node: AdvancedNodeWithId,
  idSet: ReadonlySet<string>,
): AdvancedNodeWithId => {
  if (node.kind === "condition") return node

  return {
    ...node,
    children: node.children
      .filter((c) => !(c.kind === "condition" && idSet.has(c.id)))
      .map((c) => pruneInNode(c, idSet)),
  }
}

const pruneInGroup = (
  root: AdvancedGroupNode,
  idSet: ReadonlySet<string>,
): AdvancedGroupNode => ({
  ...root,
  children: root.children
    .filter((c) => !(c.kind === "condition" && idSet.has(c.id)))
    .map((c) => pruneInNode(c, idSet)),
})

const coerceDateInNode = (node: AdvancedNodeWithId): AdvancedNodeWithId => {
  if (node.kind === "condition") {
    if (TRAD_COERCIBLE_DATE_FIELDS.has(node.condition.field)) {
      return {
        ...node,
        condition: { ...node.condition, field: "date_published" },
      }
    }

    return node
  }

  return { ...node, children: node.children.map(coerceDateInNode) }
}

const coerceDateInGroup = (root: AdvancedGroupNode): AdvancedGroupNode => ({
  ...root,
  children: root.children.map(coerceDateInNode),
})

const getNodeAtInternal = (
  tree: AdvancedGroupNode,
  path: readonly number[],
): AdvancedNodeWithId | undefined => {
  let current: AdvancedNodeWithId = tree
  for (const idx of path) {
    if (current.kind !== "group") return undefined
    const child: AdvancedNodeWithId | undefined = current.children[idx]
    if (child === undefined) return undefined
    current = child
  }

  return current
}

const applyPatchSmart = (
  tree: AdvancedGroupNode,
  path: readonly number[],
  patch: Partial<AdvancedCondition>,
): AdvancedGroupNode => {
  const node = getNodeAtInternal(tree, path)
  if (!node || node.kind !== "condition") return tree
  const current = node.condition

  const finalPatch: Partial<AdvancedCondition> = { ...patch }

  if (patch.field !== undefined && patch.field !== current.field) {
    const newField = findField(patch.field)
    if (newField) {
      const candidateOperator = patch.operator ?? current.operator
      if (!newField.availableOps.includes(candidateOperator)) {
        const fallbackOp = newField.availableOps[0]
        if (fallbackOp !== undefined) {
          finalPatch.operator = fallbackOp
        }
      }
      if (patch.value === undefined) {
        const effectiveOp = finalPatch.operator ?? candidateOperator
        finalPatch.value = resetValueForOperator(effectiveOp)
      }
    }
  }

  if (
    patch.operator !== undefined
    && patch.operator !== current.operator
    && patch.value === undefined
  ) {
    finalPatch.value = resetValueForOperator(patch.operator)
  }

  return updateConditionAt(tree, path, finalPatch)
}

export const buildInitialState = (
  initialDb: DbSelectValue,
  initialAdv: string | null,
): AdvancedSearchState => ({
  mode: initialDb === ALL_DB_VALUE ? "cross" : "single",
  db: initialDb,
  tree: createEmptyRoot(),
  pendingDb: null,
  initialAdv,
})

export const advancedSearchReducer = (
  state: AdvancedSearchState,
  action: AdvancedSearchAction,
): AdvancedSearchState => {
  switch (action.type) {
    case "CHANGE_DB_REQUEST": {
      const targetDb: DbSelectValue = action.next
      if (targetDb === state.db) return state
      const toRemoveIds = collectRemovableIds(state.tree, targetDb)
      if (toRemoveIds.length === 0) {
        const coercedTree = targetDb === "trad"
          ? coerceDateInGroup(state.tree)
          : state.tree

        return {
          ...state,
          mode: targetDb === ALL_DB_VALUE ? "cross" : "single",
          db: targetDb,
          tree: coercedTree,
          pendingDb: null,
        }
      }

      return {
        ...state,
        pendingDb: { next: targetDb, toRemoveIds },
      }
    }

    case "CONFIRM_DB_CHANGE": {
      if (state.pendingDb === null) return state
      const { next: confirmedDb, toRemoveIds } = state.pendingDb
      const pruned = pruneInGroup(state.tree, new Set(toRemoveIds))
      const finalTree = confirmedDb === "trad"
        ? coerceDateInGroup(pruned)
        : pruned

      return {
        ...state,
        mode: confirmedDb === ALL_DB_VALUE ? "cross" : "single",
        db: confirmedDb,
        tree: finalTree,
        pendingDb: null,
      }
    }

    case "CANCEL_DB_CHANGE":
      return { ...state, pendingDb: null }

    case "ADD_CONDITION": {
      const fieldId = action.fieldId ?? DEFAULT_FIELD_ID
      const condition = buildDefaultCondition(fieldId)

      return {
        ...state,
        tree: addConditionAt(state.tree, action.path, condition),
      }
    }

    case "ADD_GROUP":
      return {
        ...state,
        tree: addGroupAt(state.tree, action.path, "AND"),
      }

    case "REMOVE_NODE":
      return {
        ...state,
        tree: removeAt(state.tree, action.path),
      }

    case "UPDATE_CONDITION":
      return {
        ...state,
        tree: applyPatchSmart(state.tree, action.path, action.patch),
      }

    case "SET_GROUP_LOGIC":
      return {
        ...state,
        tree: setGroupLogicAt(state.tree, action.path, action.logic),
      }

    case "APPLY_EXAMPLE":
      return {
        ...state,
        mode: action.example.db === ALL_DB_VALUE ? "cross" : "single",
        db: action.example.db,
        tree: action.example.tree,
        pendingDb: null,
      }

    case "RESET":
      return {
        ...state,
        tree: createEmptyRoot(),
        pendingDb: null,
      }
  }
}
