import { useCallback, useRef, useState } from "react"

import { buildRequestInit, joinUrl, type ParseNode } from "~/lib/api"

const ASSISTANT_PATH = "/api/llm/search-assistant"

// Dev server only (never under vitest): return a canned AST without hitting the
// LLM endpoint so the proposal UI can be seen end to end.
const DEV_STUB = import.meta.env.DEV && import.meta.env.MODE !== "test"

const DEV_SAMPLE_PROPOSAL: ParseNode = {
  op: "AND",
  rules: [
    { op: "contains", field: "organism_name", value: "Homo sapiens" },
    { op: "contains", field: "title", value: "single cell" },
    { op: "between", field: "date_published", from: "2022-01-01", to: "2024-12-31" },
  ],
}

export type AiRequestMode = "new" | "append"

export type AssistantStartOptions = {
  mode?: AiRequestMode | undefined
  // The current builder AST, sent in append mode so the model folds the new
  // request into it (the BFF serializes it to DSL for the prompt).
  current?: ParseNode | undefined
}

export type AssistantState = "idle" | "streaming" | "done" | "error"

export type AssistantStreamResult = {
  state: AssistantState
  proposal: ParseNode | null
  start: (input: string, options?: AssistantStartOptions) => Promise<void>
  stop: () => void
  reset: () => void
}

const isParseNode = (value: unknown): value is ParseNode =>
  typeof value === "object" && value !== null
  && typeof (value as { op?: unknown }).op === "string"

const parseSseEvents = (chunk: string): { event: string; data: string }[] => {
  const events: { event: string; data: string }[] = []
  for (const block of chunk.split("\n\n")) {
    if (block.trim() === "") continue
    let event = "message"
    const lines: string[] = []
    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) event = line.slice("event:".length).trim()
      if (line.startsWith("data:")) lines.push(line.slice("data:".length).trim())
    }
    if (lines.length > 0) {
      events.push({ event, data: lines.join("\n") })
    }
  }

  return events
}

export const useAssistantStream = (baseUrl?: string): AssistantStreamResult => {
  const [state, setState] = useState<AssistantState>("idle")
  const [proposal, setProposal] = useState<ParseNode | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setState((current) => (current === "streaming" ? "idle" : current))
  }, [])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setProposal(null)
    setState("idle")
  }, [])

  const start = useCallback(async (input: string, options?: AssistantStartOptions) => {
    if (state === "streaming") return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setState("streaming")
    setProposal(null)
    if (DEV_STUB) {
      await new Promise((resolve) => setTimeout(resolve, 600))
      if (controller.signal.aborted) return
      setProposal(DEV_SAMPLE_PROPOSAL)
      setState("done")

      return
    }
    try {
      const init = buildRequestInit({
        method: "POST",
        baseUrl,
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        signal: controller.signal,
        body: JSON.stringify({
          input,
          ...(options?.mode ? { mode: options.mode } : {}),
          ...(options?.current !== undefined ? { current: options.current } : {}),
        }),
      })
      const response = await fetch(joinUrl(baseUrl, ASSISTANT_PATH), init)
      if (!response.ok || !response.body) {
        setState("error")

        return
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const eventBoundary = buffer.lastIndexOf("\n\n")
        if (eventBoundary === -1) continue
        const ready = buffer.slice(0, eventBoundary)
        buffer = buffer.slice(eventBoundary + 2)
        for (const item of parseSseEvents(ready)) {
          if (item.event === "done") {
            let raw: unknown
            try {
              raw = JSON.parse(item.data)
            } catch {
              setState("error")
              continue
            }
            if (isParseNode(raw)) {
              setProposal(raw)
              setState("done")
            } else {
              setState("error")
            }
          }
          if (item.event === "error") setState("error")
        }
      }
      setState((current) => (current === "streaming" ? "done" : current))
    } catch (error) {
      if ((error as { name?: string }).name === "AbortError") {
        setState("idle")

        return
      }
      setState("error")
    }
  }, [baseUrl, state])

  return { state, proposal, start, stop, reset }
}
