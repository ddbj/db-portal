import type { ParseNode } from "~/lib/api"

export const astEquals = (a: ParseNode, b: ParseNode): boolean => {
  if (a.op !== b.op) return false
  switch (a.op) {
    case "free_text":
      return a.value === (b as Extract<ParseNode, { op: "free_text" }>).value
    case "eq":
    case "contains":
    case "wildcard": {
      const bb = b as Extract<ParseNode, { op: "eq" | "contains" | "wildcard" }>
      return a.field === bb.field && a.value === bb.value
    }
    case "between": {
      const bb = b as Extract<ParseNode, { op: "between" }>
      return a.field === bb.field && a.from === bb.from && a.to === bb.to
    }
    case "AND":
    case "OR":
    case "NOT": {
      const bb = b as Extract<ParseNode, { op: "AND" | "OR" | "NOT" }>
      if (a.rules.length !== bb.rules.length) return false
      return a.rules.every((rule, index) => {
        const other = bb.rules[index]
        if (other === undefined) return false

        return astEquals(rule, other)
      })
    }
  }
}
