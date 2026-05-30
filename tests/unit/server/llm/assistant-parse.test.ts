import { describe, expect, test } from "vitest"

import type { ServerEnv } from "../../../../server/lib/env"
import { extractDsl, stripUnsupported } from "../../../../server/llm/assistant/dsl"
import { parseModelOutput } from "../../../../server/llm/assistant/parse"

const env = { DB_PORTAL_SEARCH_API_URL: "https://search.test/api" } as unknown as ServerEnv

const stubFetch = (impl: (url: string) => Response): typeof fetch =>
  (async (url: string) => impl(url)) as unknown as typeof fetch

describe("extractDsl", () => {
  test("plainLine_returnedAsIs", () => {
    expect(extractDsl('organism_name:"Homo sapiens"')).toBe('organism_name:"Homo sapiens"')
  })

  test("codeFence_isStripped", () => {
    expect(extractDsl("```\ntitle:cancer*\n```")).toBe("title:cancer*")
  })

  test("fenceWithLanguage_isStripped", () => {
    expect(extractDsl("```dsl\ntitle:cancer*\n```")).toBe("title:cancer*")
  })

  test("leadingBlankLines_takesFirstNonEmptyLine", () => {
    expect(extractDsl("\n\nidentifier:PRJNA*\ntrailing")).toBe("identifier:PRJNA*")
  })
})

describe("stripUnsupported", () => {
  test("fuzzy_isRemoved", () => {
    expect(stripUnsupported("description:methylation~2")).toBe("description:methylation")
  })

  test("boost_isRemoved", () => {
    expect(stripUnsupported("title:cancer^3 AND description:x")).toBe("title:cancer AND description:x")
  })

  test("bareModifier_isRemoved", () => {
    expect(stripUnsupported("title:term~")).toBe("title:term")
  })

  test("supportedQuery_unchanged", () => {
    const dsl = '(organism_name:"Mus musculus" OR organism_name:"Rattus norvegicus") AND NOT title:draft'
    expect(stripUnsupported(dsl)).toBe(dsl)
  })
})

describe("parseModelOutput", () => {
  test("emptyOutput_returnsNoDsl", async () => {
    const outcome = await parseModelOutput("```\n```", {
      env,
      fetchImpl: stubFetch(() => {
        throw new Error("should not call parse for empty DSL")
      }),
    })
    expect(outcome).toMatchObject({ ok: false, code: "no_dsl" })
  })

  test("validDsl_returnsParsedAst", async () => {
    const ast = { op: "contains", field: "title", value: "cancer" }
    const outcome = await parseModelOutput("title:cancer", {
      env,
      fetchImpl: stubFetch(() => new Response(JSON.stringify({ ast }), { status: 200 })),
    })
    expect(outcome).toEqual({ ok: true, ast, dsl: "title:cancer" })
  })

  test("rejectedDsl_returnsInvalidDslWithDetail", async () => {
    const outcome = await parseModelOutput("foo:bar", {
      env,
      fetchImpl: stubFetch(() =>
        new Response(JSON.stringify({ detail: "unknown field 'foo'" }), { status: 400 })),
    })
    expect(outcome).toMatchObject({
      ok: false,
      code: "invalid_dsl",
      message: expect.stringContaining("unknown field"),
    })
  })

  test("fuzzyModifier_strippedBeforeParse", async () => {
    let receivedUrl = ""
    const outcome = await parseModelOutput("description:methylation~2", {
      env,
      fetchImpl: stubFetch((url) => {
        receivedUrl = url

        return new Response(
          JSON.stringify({ ast: { op: "contains", field: "description", value: "methylation" } }),
          { status: 200 },
        )
      }),
    })
    expect(outcome.ok).toBe(true)
    expect(decodeURIComponent(receivedUrl)).toContain("description:methylation")
    expect(receivedUrl).not.toContain("~2")
  })
})
