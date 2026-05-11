/* eslint-disable func-style -- TypeScript `asserts` type predicates require function declarations */
import {
  type BoolOpNode,
  type FieldClauseLeafNode,
  type FieldClauseNode,
  type FieldClauseRangeNode,
  type FreeTextNode,
  isBoolOp,
  isFieldClause,
  isFieldLeaf,
  isFieldRange,
  isFreeText,
  type SearchAstNode,
} from "@/lib/search-ast"

const formatNode = (
  node: SearchAstNode | null | undefined,
): string => {
  if (node === null) return "null"
  if (node === undefined) return "undefined"

  return `${node.kind}${"op" in node ? `:${node.op}` : ""}`
}

export function assertFreeText(
  node: SearchAstNode | null | undefined,
): asserts node is FreeTextNode {
  if (node === null || node === undefined || !isFreeText(node)) {
    throw new Error(`expected FreeTextNode, got ${formatNode(node)}`)
  }
}

export function assertFieldClause(
  node: SearchAstNode | null | undefined,
): asserts node is FieldClauseNode {
  if (node === null || node === undefined || !isFieldClause(node)) {
    throw new Error(`expected FieldClauseNode, got ${formatNode(node)}`)
  }
}

export function assertFieldLeaf(
  node: SearchAstNode | null | undefined,
): asserts node is FieldClauseLeafNode {
  assertFieldClause(node)
  if (!isFieldLeaf(node)) {
    throw new Error(
      `expected FieldClauseLeafNode (op !== "between"), got op=${node.op}`,
    )
  }
}

export function assertFieldRange(
  node: SearchAstNode | null | undefined,
): asserts node is FieldClauseRangeNode {
  assertFieldClause(node)
  if (!isFieldRange(node)) {
    throw new Error(
      `expected FieldClauseRangeNode (op === "between"), got op=${node.op}`,
    )
  }
}

export function assertBoolOp(
  node: SearchAstNode | null | undefined,
): asserts node is BoolOpNode {
  if (node === null || node === undefined || !isBoolOp(node)) {
    throw new Error(`expected BoolOpNode, got ${formatNode(node)}`)
  }
}
