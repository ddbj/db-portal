import type { ParseNode } from "~/lib/api"

import { identityAst } from "./identity"
import { mergeAstAnd } from "./merge"

type FreeTextNode = Extract<ParseNode, { op: "free_text" }>

// Render a free_text leaf back to its DSL keyword form: phrases are re-quoted so
// the box round-trips through /db-portal/parse as a phrase, bare words are
// emitted verbatim. Multiple top-level free_text leaves join with a space (the
// DSL reads space-separated free text as the AND of the tokens).
const freeTextToken = (node: FreeTextNode): string =>
  node.is_phrase ? `"${node.value}"` : node.value

type FreeTextSplit = {
  // The free text as a single keyword-box string.
  keyword: string
  // The same free text as an AST, folded back into the live sync so editing a
  // facet keeps the keyword (identityAst when there is no free text).
  keywordAst: ParseNode
  // The query with its top-level free text removed.
  rest: ParseNode
}

// Pull the top-level free_text out of a parsed query so the keyword box shows
// only the free text while the structured remainder feeds the facet sidebar and
// the held builder state. Free text nested inside OR / NOT has no keyword-box
// representation, so it stays in `rest` (where toAdvanced later drops it, as the
// structured builder cannot render a free_text leaf).
export const splitFreeText = (ast: ParseNode): FreeTextSplit => {
  if (ast.op === "free_text") {
    return { keyword: freeTextToken(ast), keywordAst: ast, rest: identityAst }
  }
  if (ast.op === "AND") {
    const freeText: FreeTextNode[] = []
    const remaining: ParseNode[] = []
    for (const child of ast.rules) {
      if (child.op === "free_text") freeText.push(child)
      else remaining.push(child)
    }

    return {
      keyword: freeText.map(freeTextToken).join(" "),
      keywordAst: freeText.length === 0 ? identityAst : mergeAstAnd(...freeText),
      rest: remaining.length === 0 ? identityAst : mergeAstAnd(...remaining),
    }
  }

  return { keyword: "", keywordAst: identityAst, rest: ast }
}
