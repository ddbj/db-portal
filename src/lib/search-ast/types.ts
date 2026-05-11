export type LeafOp = "eq" | "contains" | "wildcard"
export type RangeOp = "between"
export type BoolLogic = "AND" | "OR" | "NOT"

export interface FreeTextNode {
  readonly id: string
  readonly kind: "free_text"
  readonly value: string
}

export interface FieldClauseLeafNode {
  readonly id: string
  readonly kind: "field_clause"
  readonly field: string
  readonly op: LeafOp
  readonly value: string
}

export interface FieldClauseRangeNode {
  readonly id: string
  readonly kind: "field_clause"
  readonly field: string
  readonly op: RangeOp
  readonly from: string
  readonly to: string
}

export type FieldClauseNode = FieldClauseLeafNode | FieldClauseRangeNode

export interface BoolOpNode {
  readonly id: string
  readonly kind: "bool_op"
  readonly op: BoolLogic
  readonly children: readonly SearchAstNode[]
}

export type SearchAstNode = FreeTextNode | FieldClauseNode | BoolOpNode

export const isFreeText = (n: SearchAstNode): n is FreeTextNode =>
  n.kind === "free_text"

export const isFieldClause = (n: SearchAstNode): n is FieldClauseNode =>
  n.kind === "field_clause"

export const isBoolOp = (n: SearchAstNode): n is BoolOpNode =>
  n.kind === "bool_op"

export const isFieldRange = (n: FieldClauseNode): n is FieldClauseRangeNode =>
  n.op === "between"

export const isFieldLeaf = (n: FieldClauseNode): n is FieldClauseLeafNode =>
  n.op !== "between"

export class AstInvariantError extends Error {
  readonly code: "invalid_freetext_position" | "duplicate_freetext"

  constructor(code: "invalid_freetext_position" | "duplicate_freetext", message: string) {
    super(message)
    this.name = "AstInvariantError"
    this.code = code
  }
}
