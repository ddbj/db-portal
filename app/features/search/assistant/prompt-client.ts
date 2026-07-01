import { useCallback, useEffect, useRef, useState } from "react"

import { buildRequestInit, joinUrl, type ParseNode } from "~/lib/api"
import { type DbSlug, isDbSlug } from "~/lib/search-scope"

const ASSISTANT_PATH = "/api/llm/search-assistant"

// Dev server only (never under vitest): return a canned AST without hitting the
// LLM endpoint so the proposal UI can be seen end to end.
const DEV_STUB = import.meta.env.DEV && import.meta.env.MODE !== "test"

const DEV_SAMPLE_PROPOSAL: ParseNode = {
  op: "AND",
  rules: [
    { op: "contains", field: "organism_name", value: "Homo sapiens" },
    { op: "free_text", value: "single-cell RNA-seq", is_phrase: true },
    { op: "between", field: "date_published", from: "2022-01-01", to: "2024-12-31" },
  ],
}

type AiRequestMode = "new" | "append"

export type AssistantStartOptions = {
  mode?: AiRequestMode | undefined
  // The current builder AST, sent in append mode so the model folds the new
  // request into it (the BFF serializes it to DSL for the prompt).
  current?: ParseNode | undefined
  // The locked single-DB scope (per-DB results page). Absent on top / cross-search,
  // where the BFF derives the DB from the generated DSL and returns it in `done`.
  db?: DbSlug | undefined
}

type AssistantState = "idle" | "streaming" | "done" | "error"

export type AssistantErrorInfo = {
  // server が emit する SSE error event の `data.code` (`rate_limited` / `no_dsl` /
  // `upstream-disconnect` / `upstream-status` など)。 UI で分岐したい caller が
  // 参照する。
  code: string
  message: string
  // rate_limited (HTTP 429) のときだけ set される quota 復帰までの秒数。 UI が
  // 「再試行までの目安」表示に使う。 他の error では undefined。
  retryAfterSec?: number
}

type AssistantStreamResult = {
  state: AssistantState
  proposal: ParseNode | null
  // The DB the proposal resolved to (locked or derived); null = cross-database.
  proposalDb: DbSlug | null
  // state === "error" のとき、 server が送った code/message を保持する。 それ
  // 以外は null。 caller は表示・retry 判定に使う。
  errorInfo: AssistantErrorInfo | null
  start: (input: string, options?: AssistantStartOptions) => Promise<void>
  stop: () => void
  reset: () => void
}

const isParseNode = (value: unknown): value is ParseNode =>
  typeof value === "object" && value !== null
  && typeof (value as { op?: unknown }).op === "string"

// `done` carries { ast, db }: the validated AST plus the resolved DB slug (or
// null for cross). Tolerate a bare AST for forward/backward safety.
const parseDonePayload = (raw: unknown): { ast: ParseNode; db: DbSlug | null } | null => {
  if (isParseNode(raw)) return { ast: raw, db: null }
  if (typeof raw !== "object" || raw === null) return null
  const { ast, db } = raw as { ast?: unknown; db?: unknown }
  if (!isParseNode(ast)) return null

  return { ast, db: typeof db === "string" && isDbSlug(db) ? db : null }
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

// `onDone` lets a caller act on the validated AST the moment it arrives (e.g.
// serialize + navigate) without watching state in an effect. It is read through
// a ref so a fresh closure each render never staleness-traps the stream loop.
export const useAssistantStream = (
  baseUrl?: string,
  onDone?: (ast: ParseNode, db: DbSlug | null) => void,
): AssistantStreamResult => {
  const [state, setState] = useState<AssistantState>("idle")
  const [proposal, setProposal] = useState<ParseNode | null>(null)
  const [proposalDb, setProposalDb] = useState<DbSlug | null>(null)
  const [errorInfo, setErrorInfo] = useState<AssistantErrorInfo | null>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  const stop = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setState((current) => (current === "streaming" ? "idle" : current))
  }, [])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setProposal(null)
    setProposalDb(null)
    setErrorInfo(null)
    setState("idle")
  }, [])

  // SPA navigation away from the panel must cancel the in-flight SSE so the
  // upstream vLLM generation and 15s heartbeat (server/llm/sse.ts) are released
  // immediately rather than pinned until natural completion.
  useEffect(() => {
    return () => {
      controllerRef.current?.abort()
      controllerRef.current = null
    }
  }, [])

  const start = useCallback(async (input: string, options?: AssistantStartOptions) => {
    if (state === "streaming") return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setState("streaming")
    setProposal(null)
    setProposalDb(null)
    setErrorInfo(null)
    if (DEV_STUB) {
      await new Promise((resolve) => setTimeout(resolve, 600))
      if (controller.signal.aborted) return
      setProposal(DEV_SAMPLE_PROPOSAL)
      setProposalDb(null)
      setState("done")
      onDoneRef.current?.(DEV_SAMPLE_PROPOSAL, null)

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
          ...(options?.db ? { db: options.db } : {}),
        }),
      })
      const response = await fetch(joinUrl(baseUrl, ASSISTANT_PATH), init)
      if (!response.ok || !response.body) {
        // 429 は Retry-After / body の retryAfterSec を errorInfo に載せて UI が
        // 「あと N 秒で再試行できる」を表示できるようにする。 他 status は汎用
        // error として扱う (詳細分岐は不要)。
        if (response.status === 429) {
          const headerSec = Number.parseInt(response.headers.get("Retry-After") ?? "", 10)
          let bodySec: number | undefined
          try {
            const body = await response.json() as { retryAfterSec?: unknown }
            if (typeof body.retryAfterSec === "number" && Number.isFinite(body.retryAfterSec)) {
              bodySec = body.retryAfterSec
            }
          } catch {
            // body が JSON でなくても header で拾えれば OK
          }
          const retryAfterSec = bodySec ?? (Number.isFinite(headerSec) ? headerSec : undefined)
          setErrorInfo({
            code: "rate_limited",
            message: "",
            ...(retryAfterSec !== undefined ? { retryAfterSec } : {}),
          })
        }
        setState("error")

        return
      }
      const handleEvent = (item: { event: string; data: string }): void => {
        if (item.event === "error") {
          // SSE error event の data は `{ code, message }` JSON。 rate_limited /
          // no_dsl / upstream-disconnect の分岐を UI に届けるため保持する。
          let code = "unknown"
          let message = ""
          try {
            const parsed = JSON.parse(item.data) as { code?: unknown; message?: unknown }
            if (typeof parsed.code === "string") code = parsed.code
            if (typeof parsed.message === "string") message = parsed.message
          } catch {
            // fallback: 元の生 data を message として保持
            message = item.data
          }
          if (controllerRef.current === controller) {
            setErrorInfo({ code, message })
            setState("error")
          }

          return
        }
        if (item.event !== "done") return
        let raw: unknown
        try {
          raw = JSON.parse(item.data)
        } catch {
          setState("error")

          return
        }
        const payload = parseDonePayload(raw)
        if (!payload) {
          setState("error")

          return
        }
        setProposal(payload.ast)
        setProposalDb(payload.db)
        setState("done")
        onDoneRef.current?.(payload.ast, payload.db)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        // Normalize CRLF in case a proxy rewrote the framing.
        buffer = (buffer + decoder.decode(value, { stream: true })).replace(/\r\n/g, "\n")
        const eventBoundary = buffer.lastIndexOf("\n\n")
        if (eventBoundary === -1) continue
        const ready = buffer.slice(0, eventBoundary)
        buffer = buffer.slice(eventBoundary + 2)
        for (const item of parseSseEvents(ready)) handleEvent(item)
      }
      // Flush the final frame: the terminal `done` / `error` event can arrive
      // without a trailing blank line and would otherwise be stranded in `buffer`.
      for (const item of parseSseEvents(buffer)) handleEvent(item)
      setState((current) => (current === "streaming" ? "done" : current))
    } catch (error) {
      // 別 start が既に走っている場合、 この abort/error の後片付けで新 request の
      // state を潰してはいけない。 呼び出し当時 controller と現 ref が一致する
      // ときだけ state を書き換える (H19 の連続 submit race を封じる)。
      if (controllerRef.current !== controller) return
      if ((error as { name?: string }).name === "AbortError") {
        setState("idle")

        return
      }
      setErrorInfo({ code: "client_error", message: error instanceof Error ? error.message : String(error) })
      setState("error")
    }
  }, [baseUrl, state])

  return { state, proposal, proposalDb, errorInfo, start, stop, reset }
}
