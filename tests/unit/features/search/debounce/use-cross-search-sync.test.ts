import { act, renderHook, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, test } from "vitest"

import { identityAst, useCrossSearchSync } from "~/features/search"
import type { ParseNode } from "~/lib/api"

import { server } from "../../../mocks/server"

const freeText = (value: string): ParseNode => ({ op: "free_text", value, is_phrase: false })

// Echo the queried keyword back through parse and serialize so a test can
// assert which input ultimately reached the network.
const echoHandlers = () => [
  http.get("*/db-portal/parse", ({ request }) => {
    const q = new URL(request.url).searchParams.get("q") ?? ""

    return HttpResponse.json({ ast: freeText(q) })
  }),
  http.post("*/db-portal/serialize", async ({ request }) => {
    const body = await request.json() as { ast: { value?: string } }

    return HttpResponse.json({ dsl: `dsl:${body.ast.value ?? ""}` })
  }),
]

describe("useCrossSearchSync", () => {
  test("emptyKeyword_identityAst_staysIdle", () => {
    const { result } = renderHook(() => useCrossSearchSync("", identityAst))
    expect(result.current.status).toBe("idle")
    expect(result.current.dsl).toBe("")
    expect(result.current.parseError).toBe(false)
  })

  test("keyword_eventuallySyncsDsl", async () => {
    server.use(...echoHandlers())
    const { result } = renderHook(() => useCrossSearchSync("cancer", identityAst))
    await waitFor(() => expect(result.current.status).toBe("synced"), { timeout: 2500 })
    expect(result.current.dsl).toBe("dsl:cancer")
  })

  test("rapidKeywordChanges_onlyFinalValueSyncs", async () => {
    server.use(...echoHandlers())
    // Start empty (idle, no request), then type quickly: the debounce must
    // coalesce the intermediate "ca" away and only sync the final "cancer".
    const { result, rerender } = renderHook(
      ({ kw }) => useCrossSearchSync(kw, identityAst),
      { initialProps: { kw: "" } },
    )
    expect(result.current.status).toBe("idle")
    rerender({ kw: "ca" })
    rerender({ kw: "cancer" })
    await waitFor(() => expect(result.current.dsl).toBe("dsl:cancer"), { timeout: 2500 })
    expect(result.current.status).toBe("synced")
  })

  test("parseFailure_setsParseErrorAndFailed", async () => {
    server.use(http.get("*/db-portal/parse", () => new HttpResponse(null, { status: 400 })))
    const { result } = renderHook(() => useCrossSearchSync("cancer AND", identityAst))
    await waitFor(() => expect(result.current.status).toBe("failed"), { timeout: 2500 })
    expect(result.current.parseError).toBe(true)
  })

  test("retry_afterSerializeFailure_recoversToSynced", async () => {
    server.use(
      http.get("*/db-portal/parse", () => HttpResponse.json({ ast: freeText("cancer") })),
      http.post("*/db-portal/serialize", () => new HttpResponse(null, { status: 500 })),
    )
    const { result } = renderHook(() => useCrossSearchSync("cancer", identityAst))
    await waitFor(() => expect(result.current.status).toBe("failed"), { timeout: 2500 })
    expect(result.current.parseError).toBe(false)
    server.use(...echoHandlers())
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.status).toBe("synced"), { timeout: 2500 })
    expect(result.current.dsl).toBe("dsl:cancer")
  })

  test("clearingKeyword_returnsToIdleAndClearsDsl", async () => {
    server.use(...echoHandlers())
    const { result, rerender } = renderHook(
      ({ kw }) => useCrossSearchSync(kw, identityAst),
      { initialProps: { kw: "cancer" } },
    )
    await waitFor(() => expect(result.current.dsl).toBe("dsl:cancer"), { timeout: 2500 })
    rerender({ kw: "" })
    await waitFor(() => expect(result.current.status).toBe("idle"), { timeout: 2500 })
    expect(result.current.dsl).toBe("")
  })
})
