import { extractDsl, stripUnsupported } from "./dsl"
import { parseDslToAst, type SearchApiDeps } from "./search-api"

export type AstOutcome =
  | { ok: true; ast: unknown; db: string | null; dsl: string }
  | { ok: false; code: "no_dsl" | "invalid_dsl" | "upstream"; message: string }

// Normalise the model's raw completion to a single DSL line, validate it via
// ddbj-search-api, and resolve its DB. `db` set = locked single-DB; null = auto
// (cross, or derived from the Tier-3 fields the query uses). Returns the parsed
// AST + resolved DB (the wire payload for `event: done`).
export const parseModelOutput = async (
  raw: string,
  db: string | null,
  deps: SearchApiDeps,
): Promise<AstOutcome> => {
  const dsl = stripUnsupported(extractDsl(raw))
  if (dsl.length === 0) {
    return { ok: false, code: "no_dsl", message: "model output did not contain a DSL query" }
  }
  const outcome = await parseDslToAst(dsl, db, deps)
  if (outcome.ok) {
    return { ok: true, ast: outcome.ast, db: outcome.db, dsl }
  }

  return { ok: false, code: outcome.code, message: outcome.message }
}
