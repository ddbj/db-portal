import { extractDsl, stripUnsupported } from "./dsl"
import { parseDslToAst, type SearchApiDeps } from "./search-api"

export type AstOutcome =
  | { ok: true; ast: unknown; dsl: string }
  | { ok: false; code: "no_dsl" | "invalid_dsl" | "upstream"; message: string }

// Normalise the model's raw completion to a single DSL line and validate it via
// ddbj-search-api, returning the parsed AST (the wire payload for `event: done`).
export const parseModelOutput = async (raw: string, deps: SearchApiDeps): Promise<AstOutcome> => {
  const dsl = stripUnsupported(extractDsl(raw))
  if (dsl.length === 0) {
    return { ok: false, code: "no_dsl", message: "model output did not contain a DSL query" }
  }
  const outcome = await parseDslToAst(dsl, deps)
  if (outcome.ok) {
    return { ok: true, ast: outcome.ast, dsl }
  }

  return { ok: false, code: outcome.code, message: outcome.message }
}
