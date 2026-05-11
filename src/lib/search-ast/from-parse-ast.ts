import type { components } from "@/lib/api/schema.gen"

import {
  boolAnd,
  boolNot,
  boolOr,
  fieldBetween,
  fieldContains,
  fieldEq,
  fieldWildcard,
  freeText,
} from "./factory"
import type { SearchAstNode } from "./types"

export type ParseAst = components["schemas"]["DbPortalParseResponse"]["ast"]

export const parseAstToSearchAst = (parseAst: ParseAst): SearchAstNode => {
  switch (parseAst.op) {
    case "free_text":
      return freeText(parseAst.value)
    case "eq":
      return fieldEq(parseAst.field, parseAst.value)
    case "contains":
      return fieldContains(parseAst.field, parseAst.value)
    case "wildcard":
      return fieldWildcard(parseAst.field, parseAst.value)
    case "between":
      return fieldBetween(parseAst.field, parseAst.from, parseAst.to)
    case "AND":
      return boolAnd(parseAst.rules.map(parseAstToSearchAst))
    case "OR":
      return boolOr(parseAst.rules.map(parseAstToSearchAst))
    case "NOT": {
      const child = parseAst.rules[0]
      if (child === undefined) {
        throw new Error("NOT must have at least one child")
      }

      return boolNot(parseAstToSearchAst(child))
    }
  }
}
