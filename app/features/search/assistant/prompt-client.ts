import { useCallback, useRef, useState } from "react"

import { buildRequestInit, joinUrl } from "~/lib/api"

import type { AdvancedField, AdvancedOp } from "../types"

const ASSISTANT_PATH = "/api/llm/search-assistant"

export type AssistantCondition = {
  field: AdvancedField
  op: AdvancedOp
  value: string
}

export type AssistantProposal = {
  combinator: "AND" | "OR"
  conditions: AssistantCondition[]
}

export type AssistantState = "idle" | "streaming" | "done" | "error"

export type AssistantStreamResult = {
  state: AssistantState
  proposal: AssistantProposal | null
  start: (input: string) => Promise<void>
  stop: () => void
}

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
  const [proposal, setProposal] = useState<AssistantProposal | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setState((current) => (current === "streaming" ? "idle" : current))
  }, [])

  const start = useCallback(async (input: string) => {
    if (state === "streaming") return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setState("streaming")
    setProposal(null)
    try {
      const init = buildRequestInit({
        method: "POST",
        baseUrl,
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        signal: controller.signal,
        body: JSON.stringify({ input }),
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
            try {
              setProposal(JSON.parse(item.data) as AssistantProposal)
            } catch {
              // server 側で正しい JSON を保証する
            }
            setState("done")
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

  return { state, proposal, start, stop }
}
