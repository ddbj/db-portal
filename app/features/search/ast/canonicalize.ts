import type { ParseNode } from "~/lib/api"

import { identityAst, isIdentityAst } from "./identity"

export const canonicalizeAst = (node: ParseNode): ParseNode => {
  switch (node.op) {
    case "free_text":
    case "eq":
    case "contains":
    case "wildcard":
    case "between":
      return node
    case "NOT": {
      const child = node.rules[0]
      if (!child) return identityAst
      const inner = canonicalizeAst(child)
      if (isIdentityAst(inner)) return identityAst

      return { op: "NOT", rules: [inner] }
    }
    case "AND":
    case "OR": {
      const op = node.op
      const cleaned: ParseNode[] = []
      for (const child of node.rules) {
        const c = canonicalizeAst(child)
        if (isIdentityAst(c)) continue
        if (c.op === op) {
          cleaned.push(...c.rules)
        } else {
          cleaned.push(c)
        }
      }
      if (cleaned.length === 0) return identityAst
      if (cleaned.length === 1) {
        const [only] = cleaned

        return only ?? identityAst
      }

      return { op, rules: cleaned }
    }
  }
}
