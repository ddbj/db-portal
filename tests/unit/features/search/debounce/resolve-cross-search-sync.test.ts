import { http, HttpResponse } from "msw"
import { describe, expect, test } from "vitest"

import { identityAst, resolveCrossSearchSync } from "~/features/search"
import type { ParseNode } from "~/lib/api"

import { server } from "../../../mocks/server"

const freeTextNode = (value: string): ParseNode => ({
  op: "free_text",
  value,
  is_phrase: false,
})

const containsNode = (field: string, value: string): ParseNode => ({
  op: "contains",
  field,
  value,
})

const mockParse = (ast: ParseNode) =>
  http.get("*/db-portal/parse", () => HttpResponse.json({ ast }))

const mockSerialize = (dsl: string) =>
  http.post("*/db-portal/serialize", () => HttpResponse.json({ dsl }))

describe("resolveCrossSearchSync", () => {
  test("emptyKeyword_identityAst_isIdleWithoutNetwork", async () => {
    // No parse/serialize handler registered: msw errors on any stray request,
    // so reaching idle proves no HTTP was attempted.
    const outcome = await resolveCrossSearchSync("", identityAst)
    expect(outcome).toEqual({ status: "idle", dsl: "" })
  })

  test("blankKeyword_identityAst_isIdle", async () => {
    const outcome = await resolveCrossSearchSync("   ", identityAst)
    expect(outcome).toEqual({ status: "idle", dsl: "" })
  })

  test("keywordOnly_parsesAndSerializesToSynced", async () => {
    server.use(mockParse(freeTextNode("cancer")), mockSerialize("\"cancer\""))
    const outcome = await resolveCrossSearchSync("cancer", identityAst)
    expect(outcome).toEqual({ status: "synced", dsl: "\"cancer\"" })
  })

  test("emptyKeyword_structuredAst_serializesStructuredOnly", async () => {
    // parseDslToAst short-circuits the empty keyword, so only serialize runs.
    server.use(mockSerialize("organism_name CONTAINS \"Homo sapiens\""))
    const outcome = await resolveCrossSearchSync("", containsNode("organism_name", "Homo sapiens"))
    expect(outcome).toEqual({
      status: "synced",
      dsl: "organism_name CONTAINS \"Homo sapiens\"",
    })
  })

  test("keywordAndStructured_mergesBeforeSerialize", async () => {
    let serializedBody: unknown = null
    server.use(
      mockParse(freeTextNode("cancer")),
      http.post("*/db-portal/serialize", async ({ request }) => {
        serializedBody = await request.json()

        return HttpResponse.json({ dsl: "merged" })
      }),
    )
    const outcome = await resolveCrossSearchSync("cancer", containsNode("organism_name", "Homo sapiens"))
    expect(outcome).toEqual({ status: "synced", dsl: "merged" })
    // free_text AND the structured leaf are both handed to serialize.
    expect(serializedBody).toEqual({
      ast: { op: "AND", rules: [freeTextNode("cancer"), containsNode("organism_name", "Homo sapiens")] },
    })
  })

  test("parseFailure_isFailedWithParseError", async () => {
    server.use(http.get("*/db-portal/parse", () => new HttpResponse(null, { status: 400 })))
    const outcome = await resolveCrossSearchSync("cancer AND", identityAst)
    expect(outcome).toEqual({ status: "failed", parseError: true })
  })

  test("serializeFailure_isFailedWithoutParseError", async () => {
    server.use(
      mockParse(freeTextNode("cancer")),
      http.post("*/db-portal/serialize", () => new HttpResponse(null, { status: 500 })),
    )
    const outcome = await resolveCrossSearchSync("cancer", identityAst)
    expect(outcome).toEqual({ status: "failed", parseError: false })
  })
})
