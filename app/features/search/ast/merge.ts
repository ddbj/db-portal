import type { ParseNode } from "~/lib/api"

import { identityAst, isIdentityAst } from "./identity"

const flattenInto = (children: ParseNode[], node: ParseNode): void => {
  if (node.op === "AND") {
    for (const child of node.rules) flattenInto(children, child)

    return
  }
  children.push(node)
}

export const mergeAstAnd = (...nodes: ParseNode[]): ParseNode => {
  const accum: ParseNode[] = []
  for (const node of nodes) {
    if (isIdentityAst(node)) continue
    flattenInto(accum, node)
  }
  if (accum.length === 0) return identityAst
  if (accum.length === 1) {
    const head = accum[0]

    return head ?? identityAst
  }

  return { op: "AND", rules: accum }
}
