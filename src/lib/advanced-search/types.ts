import type { DbSelectValue } from "@/lib/search-url"
import type { DbId } from "@/types/db"
import type {
  AdvancedCondition,
  AdvancedFieldType,
  FieldOperator,
  LogicOperator,
} from "@/types/search"

export const MAX_NEST_DEPTH = 5

export interface AdvancedFieldDef {
  id: string
  dslName: string
  tier: 1 | 2 | 3
  type: AdvancedFieldType
  availableOps: readonly FieldOperator[]
  availableDbs: readonly DbId[]
  enumValues?: readonly { value: string; labelKey: string }[]
  placeholderKey?: string
}

export interface AdvancedConditionNode {
  id: string
  kind: "condition"
  condition: AdvancedCondition
}

export interface AdvancedGroupNode {
  id: string
  kind: "group"
  logic: LogicOperator
  children: AdvancedNodeWithId[]
}

export type AdvancedNodeWithId = AdvancedConditionNode | AdvancedGroupNode

export type ValidationError =
  | { code: "NEST_DEPTH_EXCEEDED"; path: readonly number[] }
  | { code: "INVALID_DATE_FORMAT"; path: readonly number[]; value: string }
  | { code: "INVALID_NUMBER"; path: readonly number[]; value: string }
  | { code: "MISSING_VALUE"; path: readonly number[] }
  | {
    code: "INVALID_OPERATOR_FOR_FIELD"
    path: readonly number[]
    field: string
    operator: FieldOperator
  }
  | {
    code: "FIELD_NOT_AVAILABLE_IN_CROSS_DB"
    path: readonly number[]
    field: string
  }
  | { code: "UNKNOWN_FIELD"; path: readonly number[]; field: string }
  | { code: "NOT_REQUIRES_SINGLE_CHILD"; path: readonly number[] }
  | {
    code: "WILDCARD_VALUE_CONTAINS_QUOTE"
    path: readonly number[]
    value: string
  }

export type ValidationMode = "cross" | { db: DbId }

export interface AdvancedExample {
  id: string
  labelKey: string
  db: DbSelectValue
  tree: AdvancedGroupNode
}

export interface AdvancedSearchState {
  mode: "cross" | "single"
  db: DbSelectValue
  tree: AdvancedGroupNode
  pendingDb: { next: DbSelectValue; toRemoveIds: readonly string[] } | null
  initialAdv: string | null
}

export type AdvancedSearchAction =
  | { type: "CHANGE_DB_REQUEST"; next: DbSelectValue }
  | { type: "CONFIRM_DB_CHANGE" }
  | { type: "CANCEL_DB_CHANGE" }
  | { type: "ADD_CONDITION"; path: readonly number[]; fieldId?: string }
  | { type: "ADD_GROUP"; path: readonly number[] }
  | { type: "REMOVE_NODE"; path: readonly number[] }
  | {
    type: "UPDATE_CONDITION"
    path: readonly number[]
    patch: Partial<AdvancedCondition>
  }
  | { type: "SET_GROUP_LOGIC"; path: readonly number[]; logic: LogicOperator }
  | { type: "APPLY_EXAMPLE"; example: AdvancedExample }
  | { type: "APPLY_PARSED_TREE"; tree: AdvancedGroupNode }
  | { type: "RESET" }
