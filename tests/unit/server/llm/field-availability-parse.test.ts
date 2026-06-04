import { describe, expect, test } from "vitest"

import type { ServerEnv } from "../../../../server/lib/env"
import { parseDslToAst } from "../../../../server/llm/assistant/search-api"

// Integration of the field-availability guard with the parse/resolve flow: when the
// validator rejects a Tier-1/2 cross field the resolved DB cannot serve, the BFF prunes
// those clauses and re-parses so the assistant returns a usable query instead of
// invalid_dsl. These pin the locked and auto paths plus the cases that must NOT prune.

const env = { DB_PORTAL_SEARCH_API_URL: "https://search.test/api" } as unknown as ServerEnv

const FOR_DB = "https://ddbj.nig.ac.jp/problems/field-not-available-for-db"
const IN_CROSS = "https://ddbj.nig.ac.jp/problems/field-not-available-in-cross-db"

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status })

// A fetch stub that routes on the parse request's decoded q / db query params, so a
// test can answer the un-pruned DSL differently from the pruned one.
const routeFetch = (route: (q: string, db: string | null) => Response): typeof fetch =>
  (async (url: string) => {
    const params = new URL(url).searchParams

    return route(params.get("q") ?? "", params.get("db"))
  }) as unknown as typeof fetch

const ast = { op: "AND", rules: [{ field: "rank", op: "eq", value: "species" }] }

describe("parseDslToAst field-availability repair", () => {
  test("locked taxonomy: a date clause is pruned and the query re-parses", async () => {
    const fetchImpl = routeFetch((q, db) => {
      if (db === "taxonomy" && q === "rank:species") return json({ ast })
      if (db === "taxonomy") return json({ type: FOR_DB, detail: "field 'date_published' is not available for db='taxonomy'" }, 400)

      return json({ detail: "unexpected" }, 400)
    })
    const outcome = await parseDslToAst(
      "rank:species AND date_published:[2020-01-01 TO 9999-12-31]", "taxonomy", { env, fetchImpl },
    )
    expect(outcome).toEqual({ ok: true, ast, db: "taxonomy", dsl: "rank:species" })
  })

  test("auto resolving to taxonomy: the date is pruned after the DB is derived", async () => {
    const fetchImpl = routeFetch((q, db) => {
      if (db === null) return json({ type: IN_CROSS, detail: "field 'domain' is only available in single-DB mode. use db=taxonomy." }, 400)
      if (db === "taxonomy" && q === "domain:Archaea") return json({ ast })
      if (db === "taxonomy") return json({ type: FOR_DB, detail: "field 'date_published' is not available for db='taxonomy'" }, 400)

      return json({ detail: "unexpected" }, 400)
    })
    const outcome = await parseDslToAst(
      "domain:Archaea AND date_published:[2020-01-01 TO 9999-12-31]", null, { env, fetchImpl },
    )
    expect(outcome).toEqual({ ok: true, ast, db: "taxonomy", dsl: "domain:Archaea" })
  })

  test("nothing left after pruning: stays invalid_dsl (no empty query)", async () => {
    const fetchImpl = routeFetch(() =>
      json({ type: FOR_DB, detail: "field 'date_published' is not available for db='taxonomy'" }, 400))
    const outcome = await parseDslToAst("date_published:[2020-01-01 TO 9999-12-31]", "taxonomy", { env, fetchImpl })
    expect(outcome).toMatchObject({ ok: false, code: "invalid_dsl" })
  })

  test("a for-db reject on a Tier-3 cross-DB field (not in the matrix) is NOT pruned", async () => {
    // host is a biosample field; in trad it is a hard reject, but it is NOT a degenerate
    // Tier-1/2 field, so the guard must leave it and surface invalid_dsl.
    let calls = 0
    const fetchImpl = routeFetch(() => {
      calls += 1

      return json({ type: FOR_DB, detail: "field 'host' is not available for db='trad'" }, 400)
    })
    const outcome = await parseDslToAst("host:x AND division:HUM", "trad", { env, fetchImpl })
    expect(outcome).toMatchObject({ ok: false, code: "invalid_dsl" })
    expect(calls).toBe(1) // no retry, because nothing in the matrix matched
  })

  test("pruned query that still fails to validate degrades to invalid_dsl", async () => {
    const fetchImpl = routeFetch(() =>
      json({ type: FOR_DB, detail: "field 'date_published' is not available for db='taxonomy'" }, 400))
    // Both the original and the pruned ("rank:species") parse return the same reject, so
    // the retry does not rescue it.
    const outcome = await parseDslToAst(
      "rank:species AND date_published:[2020-01-01 TO 9999-12-31]", "taxonomy", { env, fetchImpl },
    )
    expect(outcome).toMatchObject({ ok: false, code: "invalid_dsl" })
  })
})
