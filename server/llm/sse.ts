import type { Response } from "express"

const HEARTBEAT_INTERVAL_MS = 15_000

export type SseStream = {
  start: () => void
  message: (data: string) => void
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
    message: (data: string) => writeEvent("message", data),
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
  try {
    while (true) {
      if (signal.aborted) return { ok: false, reason: "aborted" }
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const boundary = buffer.lastIndexOf("\n\n")
      if (boundary === -1) continue
      const ready = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      for (const block of ready.split("\n\n")) {
        for (const line of block.split("\n")) {
          if (!line.startsWith(SSE_DATA_PREFIX)) continue
          const data = line.slice(SSE_DATA_PREFIX.length).trim()
          if (data === "" || data === "[DONE]") continue
          try {
            const json = JSON.parse(data) as {
              choices?: { delta?: { content?: string } }[]
            }
            const content = json.choices?.[0]?.delta?.content
            if (typeof content === "string" && content.length > 0) onDelta(content)
          } catch {
            // 無効な JSON は無視 (vLLM がコメント行等を送る可能性に備える)
          }
        }
      }
    }

    return { ok: true }
  } finally {
    try {
      await reader.cancel()
    } catch {
      // 既に close 済み
    }
  }
}
