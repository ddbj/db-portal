import { isBoolOp, isFreeText, type SearchAstNode } from "./types"

export const walkAst = (
  node: SearchAstNode,
  visit: (n: SearchAstNode) => void,
): void => {
  visit(node)
  if (isBoolOp(node)) {
    node.children.forEach((c) => walkAst(c, visit))
  }
}

export const findFreeText = (node: SearchAstNode): readonly string[] => {
  const out: string[] = []
  walkAst(node, (n) => {
    if (isFreeText(n)) out.push(n.value)
  })

  return out
}

export const extractFreeText = (
  node: SearchAstNode | null,
): string | null => {
  if (node === null) return null
  const found = findFreeText(node)
  if (found.length === 0) return null

  return found.join(" ")
}

export const countDepth = (node: SearchAstNode): number => {
  if (!isBoolOp(node)) return 0
  if (node.children.length === 0) return 1

  return 1 + Math.max(...node.children.map(countDepth))
}

export const countNodes = (node: SearchAstNode): number => {
  let count = 0
  walkAst(node, () => {
    count += 1
  })

  return count
}
