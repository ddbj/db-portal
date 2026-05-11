import {
  type BoolLogic,
  type FieldClauseNode,
  isBoolOp,
  isFieldClause,
  isFieldRange,
  isFreeText,
  type SearchAstNode,
} from "./types"

const NON_PHRASE_VALID = /^[A-Za-z0-9_.+-]+$/

export const needsPhrase = (value: string): boolean =>
  !NON_PHRASE_VALID.test(value)

export const escapePhrase = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")

const quoteIfNeeded = (value: string): string =>
  needsPhrase(value) ? `"${escapePhrase(value)}"` : value

const fieldClauseToDsl = (n: FieldClauseNode): string => {
  if (isFieldRange(n)) {
    return `${n.field}:[${n.from} TO ${n.to}]`
  }
  if (n.op === "wildcard") {
    return `${n.field}:${n.value}`
  }

  return `${n.field}:${quoteIfNeeded(n.value)}`
}

const precedence = (op: BoolLogic): number => {
  if (op === "NOT") return 4
  if (op === "AND") return 3

  return 2
}

const needsParens = (parent: BoolLogic, child: SearchAstNode): boolean => {
  if (!isBoolOp(child)) return false
  if (child.op === parent) {
    return parent === "NOT"
  }

  return precedence(child.op) <= precedence(parent)
}

const serializeChild = (parent: BoolLogic, child: SearchAstNode): string => {
  const inner = astToDsl(child)
  if (inner === "") return ""
  if (needsParens(parent, child)) return `(${inner})`

  return inner
}

export const astToDsl = (node: SearchAstNode | null): string => {
  if (node === null) return ""
  if (isFreeText(node)) {
    return `"${escapePhrase(node.value)}"`
  }
  if (isFieldClause(node)) {
    return fieldClauseToDsl(node)
  }
  if (isBoolOp(node)) {
    if (node.op === "NOT") {
      const child = node.children[0]
      if (child === undefined) return ""
      const inner = serializeChild("NOT", child)
      if (inner === "") return ""

      return `NOT ${inner}`
    }
    const parts = node.children
      .map((c) => serializeChild(node.op, c))
      .filter((s) => s !== "")
    if (parts.length === 0) return ""
    if (parts.length === 1) {
      const [only] = parts
      if (only !== undefined) return only
    }

    return parts.join(` ${node.op} `)
  }

  return ""
}
