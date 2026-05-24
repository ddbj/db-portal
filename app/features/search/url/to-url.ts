import { type ParseNode, type ParseNodeInput, serializeAst } from "~/lib/api"

import { isIdentityAst } from "../ast/identity"

export type SerializeAstOptions = {
  baseUrl?: string
  signal?: AbortSignal
}

export const serializeAstToDsl = async (
  ast: ParseNode,
  options: SerializeAstOptions = {},
): Promise<string> => {
  if (isIdentityAst(ast)) return ""
  const response = await serializeAst({ ast: ast as ParseNodeInput }, options)

  return response.dsl
}
