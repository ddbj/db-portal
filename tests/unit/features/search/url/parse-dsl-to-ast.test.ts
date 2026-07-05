import { http, HttpResponse } from "msw"
import { describe, expect, test } from "vitest"

import { parseDslToAst } from "~/features/search"
import type { ParseNode } from "~/lib/api"

import { server } from "../../../mocks/server"

const captureDbParam = (sink: { db: string | null }) =>
  http.get("*/db-portal/parse", ({ request }) => {
    sink.db = new URL(request.url).searchParams.get("db")
    const freeText: ParseNode = { op: "free_text", value: "ok", is_phrase: false }

    return HttpResponse.json({ ast: freeText })
  })

describe("parseDslToAst — validator scope is forwarded", () => {
  test("parseDslToAst_dbOptionSet_sendsDbQueryParam", async () => {
    // /search/results?db=sra で keyword box submit すると Tier-3 field を含む DSL を
    // per-DB scope で validate する必要がある (docs/search.md § AST と入出力経路)。
    const sink: { db: string | null } = { db: null }
    server.use(captureDbParam(sink))

    await parseDslToAst("library_strategy:WGS", { db: "sra" })

    expect(sink.db).toBe("sra")
  })

  test("parseDslToAst_dbOptionOmitted_sendsNoDbQueryParam", async () => {
    // cross scope (top / 横断検索) では db を渡さない既存挙動。
    const sink: { db: string | null } = { db: null }
    server.use(captureDbParam(sink))

    await parseDslToAst("cancer", {})

    expect(sink.db).toBeNull()
  })

  test("parseDslToAst_dbOptionNull_sendsNoDbQueryParam", async () => {
    // db=null 明示も cross 扱い (undefined と同じ)。
    const sink: { db: string | null } = { db: null }
    server.use(captureDbParam(sink))

    await parseDslToAst("cancer", { db: null })

    expect(sink.db).toBeNull()
  })

  test("parseDslToAst_emptyInput_returnsIdentityWithoutNetworkCall", async () => {
    let called = 0
    server.use(http.get("*/db-portal/parse", () => {
      called++

      return new HttpResponse(null, { status: 500 })
    }))

    const ast = await parseDslToAst("", { db: "sra" })

    expect(called).toBe(0)
    expect(ast.op).toBe("AND") // identity AST は AND([]) 形
  })
})
