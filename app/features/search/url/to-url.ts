import { type ParseNode, type ParseNodeInput, serializeAst } from "~/lib/api"

import { isIdentityAst } from "../ast/identity"
import type { DbSlug } from "../types"

type SerializeAstOptions = {
  baseUrl?: string
  signal?: AbortSignal
  // Validator scope: a per-DB scope admits Tier 3 fields (the sidebar facets
  // emit them). Omitted/null serializes in cross mode (Tier 1/2 only); sending
  // a Tier 3 field without `db` is rejected with 400 field-not-available-in-cross-db.
  db?: DbSlug | null
}

export const serializeAstToDsl = async (
  ast: ParseNode,
  options: SerializeAstOptions = {},
): Promise<string> => {
  if (isIdentityAst(ast)) return ""
  const { db, ...rest } = options
  const response = await serializeAst(
    { ast: ast as ParseNodeInput },
    { ...rest, ...(db ? { query: { db } } : {}) },
  )

  return response.dsl
}
