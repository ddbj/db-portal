import type { ServerEnv } from "../../lib/env"
import { isFieldNotAvailableForDb, pruneUnavailableFields } from "./field-availability-guard"

// The BFF talks to ddbj-search-api for the two grammar operations the assistant
// needs: validate the model's DSL into an AST (parse), and turn the current
// builder AST into a DSL string to seed append mode (serialize). BSI
// keeps no DSL grammar of its own (search.md § BSI 側に thin serializer を持たない),
// so the DB a cross-context query resolves to is taken from the parse API's own
// "field-not-available-in-cross-db" verdict rather than a duplicated field map.

export type SearchApiDeps = {
  env: ServerEnv
  fetchImpl?: typeof fetch
}

type ParseAstOutcome =
  | { ok: true; ast: unknown; db: string | null; dsl: string }
  | { ok: false; code: "invalid_dsl" | "upstream"; message: string }

// Tiebreak when a cross-context query uses only Tier-3 fields shared by several
// DBs (db-portal display order; mirrors the eval oracle's _DB_PRIORITY).
const DB_PRIORITY = ["sra", "bioproject", "biosample", "jga", "gea", "metabobank", "trad", "taxonomy"] as const

const baseUrl = (env: ServerEnv): string =>
  env.DB_PORTAL_SEARCH_API_URL.replace(/\/$/, "")

type ParseCall =
  | { kind: "ok"; ast: unknown }
  | { kind: "cross-tier3"; dbs: string[] }
  | { kind: "invalid"; message: string; type: string }
  | { kind: "upstream"; message: string }

const callParse = async (
  dsl: string,
  db: string | null,
  { env, fetchImpl = fetch }: SearchApiDeps,
): Promise<ParseCall> => {
  const query = db ? `q=${encodeURIComponent(dsl)}&db=${encodeURIComponent(db)}` : `q=${encodeURIComponent(dsl)}`
  const url = `${baseUrl(env)}/db-portal/parse?${query}`
  try {
    const response = await fetchImpl(url)
    if (response.ok) {
      const body = (await response.json()) as { ast?: unknown }

      return { kind: "ok", ast: body.ast }
    }
    if (response.status === 400) {
      const body = (await response.json().catch(() => ({}))) as { type?: string; detail?: string }
      const detail = body.detail ?? "invalid DSL"
      // cross-mode hit a Tier-3 field; the detail names the eligible DB(s)
      // ("...use db=biosample or db=sra."). Only meaningful when db was unset.
      if (db === null && (body.type ?? "").endsWith("field-not-available-in-cross-db")) {
        const dbs = [...detail.matchAll(/db=([a-z]+)/g)]
          .map((m) => m[1])
          .filter((slug): slug is string => slug !== undefined)

        return { kind: "cross-tier3", dbs }
      }

      return { kind: "invalid", message: detail, type: body.type ?? "" }
    }

    return { kind: "upstream", message: `parse responded ${response.status}` }
  } catch (error) {
    return { kind: "upstream", message: error instanceof Error ? error.message : "parse failed" }
  }
}

// Parse under a concrete DB, repairing the per-DB field-availability trap: when the
// validator rejects a Tier-1/2 cross field the DB cannot serve (a date in taxonomy,
// submitter in trad, publication in biosample), drop those clauses from the DSL and
// re-parse once so the query validates instead of surfacing as invalid_dsl (the search
// endpoint treats the now-absent field as a no-op). Returns the call plus the DSL that
// actually validated (pruned or original).
const parseUnderDb = async (
  dsl: string,
  db: string,
  deps: SearchApiDeps,
): Promise<{ call: ParseCall; dsl: string }> => {
  const call = await callParse(dsl, db, deps)
  if (call.kind === "invalid" && isFieldNotAvailableForDb(call.type)) {
    const pruned = pruneUnavailableFields(dsl, db)
    if (pruned !== null) {
      return { call: await callParse(pruned, db, deps), dsl: pruned }
    }
  }

  return { call, dsl }
}

// Validate the model's DSL and resolve its DB. `db` set = locked single-DB mode
// (the whole query must be valid there). `db` null = auto: cross when it uses
// only cross fields, otherwise the BFF re-parses under the DB the parse API
// reports the Tier-3 fields belong to (highest-priority on a tie).
export const parseDslToAst = async (
  dsl: string,
  db: string | null,
  deps: SearchApiDeps,
): Promise<ParseAstOutcome> => {
  if (db !== null) {
    const { call, dsl: usedDsl } = await parseUnderDb(dsl, db, deps)
    if (call.kind === "ok") return { ok: true, ast: call.ast, db, dsl: usedDsl }
    if (call.kind === "upstream") return { ok: false, code: "upstream", message: call.message }

    return { ok: false, code: "invalid_dsl", message: call.kind === "invalid" ? call.message : "invalid DSL" }
  }

  const first = await callParse(dsl, null, deps)
  if (first.kind === "ok") return { ok: true, ast: first.ast, db: null, dsl }
  if (first.kind === "invalid") return { ok: false, code: "invalid_dsl", message: first.message }
  if (first.kind === "upstream") return { ok: false, code: "upstream", message: first.message }

  // cross-tier3: pick the eligible DB and re-parse under it.
  const derived = DB_PRIORITY.find((slug) => first.dbs.includes(slug)) ?? first.dbs[0]
  if (derived === undefined) {
    return { ok: false, code: "invalid_dsl", message: "query uses a single-DB field with no resolvable DB" }
  }
  const { call, dsl: usedDsl } = await parseUnderDb(dsl, derived, deps)
  if (call.kind === "ok") return { ok: true, ast: call.ast, db: derived, dsl: usedDsl }
  if (call.kind === "upstream") return { ok: false, code: "upstream", message: call.message }

  // invalid / another cross-tier3 (fields from a different DB) → not expressible in one DB.
  const message = call.kind === "invalid" ? call.message : "query mixes fields from multiple DBs"

  return { ok: false, code: "invalid_dsl", message }
}

// Serialize the current builder AST to a DSL string for the append prompt.
// Best-effort: a failure just means append falls back to fresh generation.
export const serializeAstToDsl = async (
  ast: unknown,
  { env, fetchImpl = fetch }: SearchApiDeps,
): Promise<string | undefined> => {
  const url = `${baseUrl(env)}/db-portal/serialize`
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ast }),
    })
    if (!response.ok) return undefined
    const body = (await response.json()) as { dsl?: unknown }

    return typeof body.dsl === "string" && body.dsl.trim().length > 0 ? body.dsl : undefined
  } catch {
    return undefined
  }
}
