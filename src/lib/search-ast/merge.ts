import { boolAnd } from "./factory"
import {
  AstInvariantError,
  isBoolOp,
  isFreeText,
  type SearchAstNode,
} from "./types"

const flattenAndChildren = (
  asts: readonly SearchAstNode[],
): SearchAstNode[] => {
  const out: SearchAstNode[] = []
  for (const a of asts) {
    if (isBoolOp(a) && a.op === "AND") {
      out.push(...flattenAndChildren(a.children))
    } else {
      out.push(a)
    }
  }

  return out
}

const assertNoFreeTextAnywhere = (node: SearchAstNode): void => {
  if (isFreeText(node)) {
    throw new AstInvariantError(
      "invalid_freetext_position",
      "FreeText must be at AST root or direct child of root AND",
    )
  }
  if (isBoolOp(node)) {
    for (const c of node.children) assertNoFreeTextAnywhere(c)
  }
}

const assertFreeTextInvariant = (root: SearchAstNode): void => {
  if (isFreeText(root)) return

  if (isBoolOp(root) && root.op === "AND") {
    const directFreeText = root.children.filter(isFreeText)
    if (directFreeText.length > 1) {
      throw new AstInvariantError(
        "duplicate_freetext",
        "AST root AND has more than one FreeText child",
      )
    }
    for (const child of root.children) {
      if (isFreeText(child)) continue
      assertNoFreeTextAnywhere(child)
    }

    return
  }

  assertNoFreeTextAnywhere(root)
}

export const mergeAstAnd = (
  asts: readonly (SearchAstNode | null | undefined)[],
): SearchAstNode | null => {
  const nonNull = asts.filter(
    (a): a is SearchAstNode => a !== null && a !== undefined,
  )
  if (nonNull.length === 0) return null

  const flattened = flattenAndChildren(nonNull)
  if (flattened.length === 0) return null

  const freeTextCount = flattened.filter(isFreeText).length
  if (freeTextCount > 1) {
    throw new AstInvariantError(
      "duplicate_freetext",
      "Merged AST contains more than one FreeText",
    )
  }

  for (const c of flattened) {
    if (isFreeText(c)) continue
    assertNoFreeTextAnywhere(c)
  }

  if (flattened.length === 1) {
    const [only] = flattened
    if (only !== undefined) {
      assertFreeTextInvariant(only)

      return only
    }
  }

  const freeText = flattened.find(isFreeText)
  const others = flattened.filter((n) => !isFreeText(n))
  const ordered = freeText !== undefined ? [freeText, ...others] : flattened

  const result = boolAnd(ordered)
  assertFreeTextInvariant(result)

  return result
}
