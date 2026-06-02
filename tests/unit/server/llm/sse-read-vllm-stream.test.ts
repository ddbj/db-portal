import { describe, expect, test, vi } from "vitest"

import { readVllmStream } from "../../../../server/llm/sse"

const encoder = new TextEncoder()

// Build a ReadableStream that yields the given byte chunks in order.
// `onPull` records whether the consumer ever requested data from the source.
const streamFromChunks = (
  chunks: string[],
  onPull?: () => void,
): ReadableStream<Uint8Array> => {
  let index = 0

  return new ReadableStream<Uint8Array>({
    pull(controller) {
      onPull?.()
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]))
        index += 1

        return
      }

      controller.close()
    },
  })
}

describe("readVllmStream", () => {
  const dataLine = (obj: unknown): string => `data: ${JSON.stringify(obj)}\n\n`

  const chunk = (content: string): Record<string, unknown> => ({
    choices: [{ delta: { content } }],
  })

  test("readVllmStream_nullBody_returnsEmptyBodyWithoutCallingOnDelta", async () => {
    const onDelta = vi.fn()
    const result = await readVllmStream(null, new AbortController().signal, onDelta)

    expect(result).toEqual({ ok: false, reason: "empty body" })
    expect(onDelta).not.toHaveBeenCalled()
  })

  test("readVllmStream_preAbortedSignal_returnsAbortedWithoutReading", async () => {
    const onDelta = vi.fn()
    const onPull = vi.fn()
    const controller = new AbortController()
    controller.abort()
    const body = streamFromChunks([dataLine(chunk("never"))], onPull)

    const result = await readVllmStream(body, controller.signal, onDelta)

    expect(result).toEqual({ ok: false, reason: "aborted" })
    expect(onPull).not.toHaveBeenCalled()
    expect(onDelta).not.toHaveBeenCalled()
  })

  test("readVllmStream_eventSplitAcrossTwoReadsAtBoundary_emitsContentOnce", async () => {
    const onDelta = vi.fn()
    const full = dataLine(chunk("hello"))
    // Split mid-event so the first read has no complete "\n\n" boundary yet.
    const cut = full.indexOf("o") + 1
    const body = streamFromChunks([full.slice(0, cut), full.slice(cut)])

    const result = await readVllmStream(body, new AbortController().signal, onDelta)

    expect(result).toEqual({ ok: true })
    expect(onDelta.mock.calls).toEqual([["hello"]])
  })

  test("readVllmStream_boundaryLandsExactlyBetweenReads_emitsContent", async () => {
    const onDelta = vi.fn()
    const body = streamFromChunks([
      `data: ${JSON.stringify(chunk("split"))}`,
      "\n\n",
    ])

    const result = await readVllmStream(body, new AbortController().signal, onDelta)

    expect(result).toEqual({ ok: true })
    expect(onDelta.mock.calls).toEqual([["split"]])
  })

  test("readVllmStream_mixedControlAndDataLines_emitsOnlyRealContentInOrder", async () => {
    const onDelta = vi.fn()
    const body = streamFromChunks([
      ": keep-alive comment\n\n",
      dataLine(chunk("alpha")),
      "data: [DONE]\n\n",
      "data: \n\n",
      "data: {not valid json}\n\n",
      dataLine({ choices: [{ delta: {} }] }),
      dataLine({ choices: [{ delta: { content: "" } }] }),
      dataLine(chunk("beta")),
    ])

    const result = await readVllmStream(body, new AbortController().signal, onDelta)

    expect(result).toEqual({ ok: true })
    expect(onDelta.mock.calls).toEqual([["alpha"], ["beta"]])
  })

  test("readVllmStream_multipleEventsInOneRead_emitsEachInOrder", async () => {
    const onDelta = vi.fn()
    const body = streamFromChunks([
      dataLine(chunk("one")) + dataLine(chunk("two")) + dataLine(chunk("three")),
    ])

    const result = await readVllmStream(body, new AbortController().signal, onDelta)

    expect(result).toEqual({ ok: true })
    expect(onDelta.mock.calls).toEqual([["one"], ["two"], ["three"]])
  })

  test("readVllmStream_missingChoices_skipsWithoutEmitting", async () => {
    const onDelta = vi.fn()
    const body = streamFromChunks([
      dataLine({ id: "x", object: "chat.completion.chunk" }),
      dataLine(chunk("real")),
    ])

    const result = await readVllmStream(body, new AbortController().signal, onDelta)

    expect(result).toEqual({ ok: true })
    expect(onDelta.mock.calls).toEqual([["real"]])
  })

  test("readVllmStream_trailingEventWithoutFinalBoundary_isNotEmitted", async () => {
    const onDelta = vi.fn()
    // The second event lacks the closing "\n\n", so it stays buffered and is
    // never flushed: only complete "\n\n"-terminated events are processed.
    const body = streamFromChunks([
      dataLine(chunk("flushed")),
      `data: ${JSON.stringify(chunk("dangling"))}`,
    ])

    const result = await readVllmStream(body, new AbortController().signal, onDelta)

    expect(result).toEqual({ ok: true })
    expect(onDelta.mock.calls).toEqual([["flushed"]])
  })
})
