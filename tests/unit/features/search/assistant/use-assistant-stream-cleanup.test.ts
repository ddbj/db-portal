import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import { useAssistantStream } from "~/features/search/assistant"

// fetch を spy して AbortSignal が unmount で fire するか確認する。
// 実 SSE 応答は流さず、 永遠に pending の ReadableStream を返すことで「mid-stream
// で SPA navigation が走った」 状況を再現する。
let originalFetch: typeof fetch
let capturedSignal: AbortSignal | null = null

beforeEach(() => {
  originalFetch = global.fetch
  capturedSignal = null
  global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    capturedSignal = init?.signal ?? null

    return new Response(
      new ReadableStream({
        start() { /* stay open until externally aborted */ },
      }),
      { status: 200, headers: { "content-type": "text/event-stream" } },
    )
  }) as typeof fetch
})

afterEach(() => {
  global.fetch = originalFetch
})

describe("useAssistantStream — cleanup on unmount", () => {
  test("unmountWhileStreaming_abortsInFlightFetch", async () => {
    const { result, unmount } = renderHook(() => useAssistantStream(undefined))

    // start は ReadableStream を消費し続けるので await すると永久に hang する。
    // fire-and-forget で発火し、 fetch が capturedSignal を受け取った時点で unmount。
    act(() => {
      void result.current.start("any prompt", { mode: "new" })
    })

    await waitFor(() => {
      expect(capturedSignal, "fetch must receive an AbortSignal").not.toBeNull()
    }, { timeout: 2000 })
    expect(capturedSignal!.aborted).toBe(false)

    unmount()

    // unmount cleanup が controller.abort() を呼ぶ → signal は aborted へ。
    expect(capturedSignal!.aborted).toBe(true)
  })
})
