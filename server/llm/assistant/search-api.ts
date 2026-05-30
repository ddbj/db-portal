import type { ServerEnv } from "../../lib/env"

// The BFF talks to ddbj-search-api for the two grammar operations the assistant
// needs: validate the model's DSL into an AST (parse), and turn the current
// builder AST into a DSL string to seed append mode (serialize). The portal
// keeps no DSL grammar of its own (search.md § portal 側に thin serializer を持たない).

export type SearchApiDeps = {
  env: ServerEnv
  fetchImpl?: typeof fetch
}

export type ParseAstOutcome =
  | { ok: true; ast: unknown }
  | { ok: false; code: "invalid_dsl" | "upstream"; message: string }

const baseUrl = (env: ServerEnv): string =>
  env.DB_PORTAL_SEARCH_API_URL.replace(/\/$/, "")

export const parseDslToAst = async (
  dsl: string,
  { env, fetchImpl = fetch }: SearchApiDeps,
): Promise<ParseAstOutcome> => {
  const url = `${baseUrl(env)}/db-portal/parse?q=${encodeURIComponent(dsl)}`
  try {
    const response = await fetchImpl(url)
    if (response.ok) {
      const body = (await response.json()) as { ast?: unknown }

      return { ok: true, ast: body.ast }
    }
    if (response.status === 400) {
      const body = (await response.json().catch(() => ({}))) as { detail?: string }

      return { ok: false, code: "invalid_dsl", message: body.detail ?? "invalid DSL" }
    }

    return { ok: false, code: "upstream", message: `parse responded ${response.status}` }
  } catch (error) {
    return { ok: false, code: "upstream", message: error instanceof Error ? error.message : "parse failed" }
  }
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
