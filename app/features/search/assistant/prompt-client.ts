import { useCallback, useRef, useState } from "react"

import { buildRequestInit, joinUrl, type ParseNode } from "~/lib/api"
import { AssistantProposalSchema } from "~/schemas/api-bff/llm"

import { assistantProposalToAst } from "./proposal-apply"

export type { AssistantCondition, AssistantProposal } from "~/schemas/api-bff/llm"

const ASSISTANT_PATH = "/api/llm/search-assistant"

// Dev server only (never under vitest): return a canned query without hitting
// the LLM endpoint so the proposal preview can be seen end to end. This sample
// exercises the full DSL the renderer must handle — a phrase, an OR group, a
// negated leaf, a negated group, a date range and a wildcard.
const DEV_STUB = import.meta.env.DEV && import.meta.env.MODE !== "test"

const DEV_SAMPLE_AST: ParseNode = {
  op: "AND",
  rules: [
    { op: "free_text", value: "single cell", is_phrase: true },
    {
      op: "OR",
      rules: [
        { op: "eq", field: "organism_name", value: "Homo sapiens" },
        { op: "eq", field: "organism_name", value: "Mus musculus" },
      ],
    },
    { op: "NOT", rules: [{ op: "eq", field: "accessibility", value: "controlled-access" }] },
    {
      op: "NOT",
      rules: [
        {
          op: "AND",
          rules: [
            { op: "contains", field: "title", value: "draft" },
            { op: "wildcard", field: "identifier", value: "TMP*" },
          ],
        },
      ],
    },
    { op: "between", field: "date_published", from: "2022-01-01", to: "2024-12-31" },
    { op: "wildcard", field: "identifier", value: "PRJDB*" },
  ],
}

export type AssistantState = "idle" | "streaming" | "done" | "error"

export type AssistantStreamResult = {
  state: AssistantState
  proposal: ParseNode | null
  start: (input: string) => Promise<void>
  stop: () => void
  reset: () => void
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

  const start = useCallback(async (input: string) => {
    if (state === "streaming") return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setState("streaming")
    setProposal(null)
    if (DEV_STUB) {
      await new Promise((resolve) => setTimeout(resolve, 600))
      if (controller.signal.aborted) return
      setProposal(DEV_SAMPLE_AST)
      setState("done")

      return
    }
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
            let raw: unknown
            try {
              raw = JSON.parse(item.data)
            } catch {
              setState("error")
              continue
            }
            const parsed = AssistantProposalSchema.safeParse(raw)
            if (parsed.success) {
              setProposal(assistantProposalToAst(parsed.data))
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
