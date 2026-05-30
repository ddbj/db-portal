import { type ParseNode, parseQuery } from "~/lib/api"

import { identityAst } from "../ast/identity"
import type { DbSlug } from "../types"

export type ParseDslOptions = {
  baseUrl?: string
  signal?: AbortSignal
  // Validator scope: a per-DB scope admits Tier 3 fields; cross mode (null) only
  // Tier 1/2. Mirrors serializeAstToDsl so the builder's live preview parses a
  // keyword the same way the chosen scope will run it.
  db?: DbSlug | null
}

export const parseDslToAst = async (
  q: string,
  options: ParseDslOptions = {},
): Promise<ParseNode> => {
  if (q.length === 0) return identityAst
  const { db, ...rest } = options
  const response = await parseQuery({ q, ...(db ? { db } : {}) }, rest)

  return response.ast
}
