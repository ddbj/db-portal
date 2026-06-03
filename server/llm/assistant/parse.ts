import { extractDsl, stripUnsupported } from "./dsl"
import { type AstNode, repairCrossPlane } from "./plane-guard"
import { parseDslToAst, type SearchApiDeps, serializeAstToDsl } from "./search-api"

type AstOutcome =
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
  if (!outcome.ok) {
    return { ok: false, code: outcome.code, message: outcome.message }
  }

  // Safety net for the SRA/JGA subtype-plane trap: if the resolved query ANDs fields
  // from two subtype planes (which matches zero documents), repair it — keep the
  // sample plane + cross fields, drop the experiment/analysis-plane fields, and fold
  // the primary dropped concept back in as a free-text term. Re-parse the repaired DSL
  // under the ORIGINAL scope (auto re-resolves to cross once the Tier-3 field is gone;
  // locked stays on its db). A repair that fails to re-validate degrades to the
  // original parse rather than dropping the result. (docs/search-fields.md § subtype plane 不変量)
  const repaired = repairCrossPlane(outcome.ast as AstNode, outcome.db)
  if (repaired !== null) {
    const repairedDsl = await serializeAstToDsl(repaired, deps)
    if (repairedDsl !== undefined) {
      const reparsed = await parseDslToAst(repairedDsl, db, deps)
      if (reparsed.ok) {
        return { ok: true, ast: reparsed.ast, db: reparsed.db, dsl: repairedDsl }
      }
    }
  }

  return { ok: true, ast: outcome.ast, db: outcome.db, dsl }
}
