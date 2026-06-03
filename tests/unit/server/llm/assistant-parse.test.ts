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
    const outcome = await parseModelOutput("```\n```", null, {
      env,
      fetchImpl: stubFetch(() => {
        throw new Error("should not call parse for empty DSL")
      }),
    })
    expect(outcome).toMatchObject({ ok: false, code: "no_dsl" })
  })

  test("validCrossDsl_returnsParsedAstWithNullDb", async () => {
    const ast = { op: "contains", field: "title", value: "cancer" }
    const outcome = await parseModelOutput("title:cancer", null, {
      env,
      fetchImpl: stubFetch(() => new Response(JSON.stringify({ ast }), { status: 200 })),
    })
    expect(outcome).toEqual({ ok: true, ast, db: null, dsl: "title:cancer" })
  })

  test("lockedDb_parsesWithThatDbAndEchoesIt", async () => {
    let receivedUrl = ""
    const ast = { op: "eq", field: "library_strategy", value: "RNA-Seq" }
    const outcome = await parseModelOutput("library_strategy:RNA-Seq", "sra", {
      env,
      fetchImpl: stubFetch((url) => {
        receivedUrl = url

        return new Response(JSON.stringify({ ast }), { status: 200 })
      }),
    })
    expect(outcome).toEqual({ ok: true, ast, db: "sra", dsl: "library_strategy:RNA-Seq" })
    expect(receivedUrl).toContain("db=sra")
  })

  test("autoMode_derivesDbFromCrossTier3Verdict", async () => {
    const calls: string[] = []
    const ast = { op: "eq", field: "library_strategy", value: "RNA-Seq" }
    const outcome = await parseModelOutput("library_strategy:RNA-Seq", null, {
      env,
      fetchImpl: stubFetch((url) => {
        calls.push(url)
        if (!url.includes("db=")) {
          return new Response(
            JSON.stringify({
              type: "https://ddbj.nig.ac.jp/problems/field-not-available-in-cross-db",
              detail: "field 'library_strategy' is only available in single-DB mode at column 1. use db=sra.",
            }),
            { status: 400 },
          )
        }

        return new Response(JSON.stringify({ ast }), { status: 200 })
      }),
    })
    expect(outcome).toEqual({ ok: true, ast, db: "sra", dsl: "library_strategy:RNA-Seq" })
    expect(calls).toHaveLength(2)
    expect(calls[1]).toContain("db=sra")
  })

  test("autoMode_sharedTier3PicksByPriority", async () => {
    let derivedUrl = ""
    const ast = { op: "contains", field: "geo_loc_name", value: "Japan" }
    const outcome = await parseModelOutput("geo_loc_name:Japan", null, {
      env,
      fetchImpl: stubFetch((url) => {
        if (!url.includes("db=")) {
          return new Response(
            JSON.stringify({
              type: "https://ddbj.nig.ac.jp/problems/field-not-available-in-cross-db",
              detail: "field 'geo_loc_name' is only available in single-DB mode at column 1. use db=biosample or db=sra.",
            }),
            { status: 400 },
          )
        }
        derivedUrl = url

        return new Response(JSON.stringify({ ast }), { status: 200 })
      }),
    })
    // sra outranks biosample in the tiebreak order.
    expect(outcome).toMatchObject({ ok: true, db: "sra" })
    expect(derivedUrl).toContain("db=sra")
  })

  test("autoMode_mixedDbsAreRejectedAsInvalid", async () => {
    // host (biosample) + library_strategy (sra): cross verdict points at biosample,
    // re-parse under biosample then rejects the sra field → invalid_dsl.
    const outcome = await parseModelOutput("host:human AND library_strategy:RNA-Seq", null, {
      env,
      fetchImpl: stubFetch((url) => {
        if (!url.includes("db=")) {
          return new Response(
            JSON.stringify({
              type: "https://ddbj.nig.ac.jp/problems/field-not-available-in-cross-db",
              detail: "field 'host' is only available in single-DB mode at column 1. use db=biosample.",
            }),
            { status: 400 },
          )
        }

        return new Response(
          JSON.stringify({ detail: "field 'library_strategy' is not available for db=biosample" }),
          { status: 400 },
        )
      }),
    })
    expect(outcome).toMatchObject({ ok: false, code: "invalid_dsl" })
  })

  test("rejectedDsl_returnsInvalidDslWithDetail", async () => {
    const outcome = await parseModelOutput("foo:bar", null, {
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
    const outcome = await parseModelOutput("description:methylation~2", null, {
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
