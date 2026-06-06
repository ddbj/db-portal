import type { Response } from "express"
import { z } from "zod"

const HEARTBEAT_INTERVAL_MS = 15_000

const VllmStreamChunkSchema = z.object({
  choices: z.array(
    z.object({
      delta: z.object({
        content: z.string().optional(),
      }).optional(),
    }),
  ).optional(),
}).passthrough()

// The search assistant never streams raw model output (no `message` event): the
// BFF accumulates the completion server-side and emits only a validated `done` or
// an `error`, so a prompt injection cannot turn the endpoint into an open LLM
// proxy (docs/llm.md § プロンプトインジェクション対策). Heartbeats keep the
// connection alive during generation.
type SseStream = {
  start: () => void
  done: (data: string) => void
  error: (code: string, message: string) => void
  close: () => void
}

export const openSseStream = (res: Response): SseStream => {
  res.setHeader("Content-Type", "text/event-stream")
  res.setHeader("Cache-Control", "no-store")
  res.setHeader("X-Accel-Buffering", "no")
  res.setHeader("Connection", "keep-alive")

  let heartbeat: ReturnType<typeof setInterval> | null = null
  let closed = false

  const writeRaw = (chunk: string): void => {
    if (closed) return
    try {
      res.write(chunk)
    } catch {
      closed = true
    }
  }

  const startHeartbeat = (): void => {
    if (heartbeat) return
    heartbeat = setInterval(() => {
      writeRaw(": heartbeat\n\n")
    }, HEARTBEAT_INTERVAL_MS)
    heartbeat.unref?.()
  }

  const stopHeartbeat = (): void => {
    if (heartbeat) {
      clearInterval(heartbeat)
      heartbeat = null
    }
  }

  const writeEvent = (event: string, data: string): void => {
    const payload = data
      .split("\n")
      .map((line) => `data: ${line}`)
      .join("\n")
    writeRaw(`event: ${event}\n${payload}\n\n`)
  }

  return {
    start: () => {
      // 接続維持の最初の空 comment (proxy が status / headers を流すきっかけ)
      writeRaw(": stream-open\n\n")
      startHeartbeat()
    },
    done: (data: string) => writeEvent("done", data),
    error: (code: string, message: string) => writeEvent("error", JSON.stringify({ code, message })),
    close: () => {
      stopHeartbeat()
      if (!closed) {
        try {
          res.end()
        } catch {
          // already closed
        }
      }
      closed = true
    },
  }
}

const SSE_DATA_PREFIX = "data:"

export const readVllmStream = async (
  body: ReadableStream<Uint8Array> | null,
  signal: AbortSignal,
  onDelta: (delta: string) => void,
): Promise<{ ok: boolean; reason?: string }> => {
  if (!body) return { ok: false, reason: "empty body" }
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  const handleBlock = (block: string): void => {
    for (const line of block.split("\n")) {
      if (!line.startsWith(SSE_DATA_PREFIX)) continue
      const data = line.slice(SSE_DATA_PREFIX.length).trim()
      if (data === "" || data === "[DONE]") continue
      let raw: unknown
      try {
        raw = JSON.parse(data)
      } catch {
        continue
      }
      const parsed = VllmStreamChunkSchema.safeParse(raw)
      if (!parsed.success) continue
      const content = parsed.data.choices?.[0]?.delta?.content
      if (typeof content === "string" && content.length > 0) onDelta(content)
    }
  }

  try {
    while (true) {
      if (signal.aborted) return { ok: false, reason: "aborted" }
      const { value, done } = await reader.read()
      if (done) break
      // Normalize CRLF framing (proxies often rewrite SSE `\n\n` to `\r\n\r\n`); a
      // CRLF split across chunk boundaries resolves on the next iteration because
      // the unprocessed tail stays in `buffer`.
      buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, "\n")
      const boundary = buffer.lastIndexOf("\n\n")
      if (boundary === -1) continue
      const ready = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      for (const block of ready.split("\n\n")) handleBlock(block)
    }
    // Flush the final frame: the last SSE frame can arrive without a trailing
    // blank line, which would otherwise strand the terminal delta in `buffer`.
    const tail = buffer.replace(/\r\n/g, "\n").trim()
    if (tail !== "") for (const block of tail.split("\n\n")) handleBlock(block)

    return { ok: true }
  } finally {
    try {
      await reader.cancel()
    } catch {
      // 既に close 済み
    }
  }
}
