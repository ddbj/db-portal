import { type ParseNode, parseQuery } from "~/lib/api"

import { identityAst } from "../ast/identity"

export type ParseDslOptions = {
  baseUrl?: string
  signal?: AbortSignal
}

export const parseDslToAst = async (
  q: string,
  options: ParseDslOptions = {},
): Promise<ParseNode> => {
  if (q.length === 0) return identityAst
  const response = await parseQuery({ q }, options)

  return response.ast
}
