import type { ParseNode } from "~/lib/api"

export const identityAst: ParseNode = { op: "AND", rules: [] }

export const isIdentityAst = (node: ParseNode): boolean =>
  node.op === "AND" && node.rules.length === 0
