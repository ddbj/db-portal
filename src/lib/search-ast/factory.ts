import { nextAstId } from "./id"
import type {
  BoolOpNode,
  FieldClauseLeafNode,
  FieldClauseRangeNode,
  FreeTextNode,
  LeafOp,
  SearchAstNode,
} from "./types"

export const freeText = (value: string): FreeTextNode => ({
  id: nextAstId(),
  kind: "free_text",
  value,
})

export const fieldLeaf = (
  field: string,
  op: LeafOp,
  value: string,
): FieldClauseLeafNode => ({
  id: nextAstId(),
  kind: "field_clause",
  field,
  op,
  value,
})

export const fieldEq = (field: string, value: string): FieldClauseLeafNode =>
  fieldLeaf(field, "eq", value)

export const fieldContains = (
  field: string,
  value: string,
): FieldClauseLeafNode => fieldLeaf(field, "contains", value)

export const fieldWildcard = (
  field: string,
  value: string,
): FieldClauseLeafNode => fieldLeaf(field, "wildcard", value)

export const fieldBetween = (
  field: string,
  from: string,
  to: string,
): FieldClauseRangeNode => ({
  id: nextAstId(),
  kind: "field_clause",
  field,
  op: "between",
  from,
  to,
})

export const boolAnd = (children: readonly SearchAstNode[]): BoolOpNode => ({
  id: nextAstId(),
  kind: "bool_op",
  op: "AND",
  children,
})

export const boolOr = (children: readonly SearchAstNode[]): BoolOpNode => ({
  id: nextAstId(),
  kind: "bool_op",
  op: "OR",
  children,
})

export const boolNot = (child: SearchAstNode): BoolOpNode => ({
  id: nextAstId(),
  kind: "bool_op",
  op: "NOT",
  children: [child],
})
