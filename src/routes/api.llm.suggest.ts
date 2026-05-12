import type { ActionFunctionArgs } from "react-router"

import {
  callSuggest,
  CURRENT_Q_MAX_LEN,
  isDbId,
  isLang,
  isSuggestTask,
  LlmEmptyResponseError,
  LlmNoDslError,
  LlmUpstreamError,
  NATURAL_TEXT_MAX_LEN,
  readLlmConfig,
  type SuggestRequest,
} from "@/server/llm"

const PROBLEM_TYPE_PREFIX = "https://portal.ddbj.nig.ac.jp/problems/llm/"

interface ProblemBody {
  type: string
  title: string
  status: number
  detail: string
}

const problem = (status: number, slug: string, title: string, detail: string): Response =>
  Response.json(
    {
      type: `${PROBLEM_TYPE_PREFIX}${slug}`,
      title,
      status,
      detail,
    } satisfies ProblemBody,
    {
      status,
      headers: {
        "Content-Type": "application/problem+json",
        "Cache-Control": "no-store",
      },
    },
  )

interface SuggestRequestBody {
  task?: unknown
  naturalText?: unknown
  db?: unknown
  currentQ?: unknown
  lang?: unknown
}

const parseBody = (raw: unknown): SuggestRequest | { error: Response } => {
  if (raw === null || typeof raw !== "object") {
    return {
      error: problem(400, "invalid-body", "Invalid request body", "JSON object required"),
    }
  }
  const body = raw as SuggestRequestBody

  if (!isSuggestTask(body.task)) {
    return {
      error: problem(400, "invalid-task", "Invalid task", "task must be 'search-dsl'"),
    }
  }
  if (!isLang(body.lang)) {
    return {
      error: problem(400, "invalid-lang", "Invalid lang", "lang must be 'ja' or 'en'"),
    }
  }
  if (typeof body.naturalText !== "string") {
    return {
      error: problem(
        400,
        "invalid-natural-text",
        "Invalid naturalText",
        "naturalText must be a string",
      ),
    }
  }
  const naturalText = body.naturalText.trim()
  if (naturalText === "") {
    return {
      error: problem(
        400,
        "empty-natural-text",
        "Empty naturalText",
        "naturalText must not be empty",
      ),
    }
  }
  if (naturalText.length > NATURAL_TEXT_MAX_LEN) {
    return {
      error: problem(
        400,
        "natural-text-too-long",
        "naturalText too long",
        `naturalText must be at most ${NATURAL_TEXT_MAX_LEN} characters`,
      ),
    }
  }

  let db: SuggestRequest["db"] = null
  if (body.db !== null && body.db !== undefined && body.db !== "") {
    if (!isDbId(body.db)) {
      return {
        error: problem(400, "invalid-db", "Invalid db", "db must be a known DDBJ DB id or null"),
      }
    }
    db = body.db
  }

  let currentQ: SuggestRequest["currentQ"] = null
  if (body.currentQ !== null && body.currentQ !== undefined && body.currentQ !== "") {
    if (typeof body.currentQ !== "string") {
      return {
        error: problem(
          400,
          "invalid-current-q",
          "Invalid currentQ",
          "currentQ must be a string or null",
        ),
      }
    }
    if (body.currentQ.length > CURRENT_Q_MAX_LEN) {
      return {
        error: problem(
          400,
          "current-q-too-long",
          "currentQ too long",
          `currentQ must be at most ${CURRENT_Q_MAX_LEN} characters`,
        ),
      }
    }
    currentQ = body.currentQ
  }

  return { task: body.task, naturalText, db, currentQ, lang: body.lang }
}

export const action = async ({ request }: ActionFunctionArgs): Promise<Response> => {
  if (request.method !== "POST") {
    return problem(405, "method-not-allowed", "Method not allowed", "Use POST")
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return problem(400, "invalid-json", "Invalid JSON", "Request body is not valid JSON")
  }

  const parsed = parseBody(raw)
  if ("error" in parsed) return parsed.error
  const req = parsed

  const config = readLlmConfig()
  if (config === null) {
    return problem(
      503,
      "not-configured",
      "LLM not configured",
      "LLM_BASE_URL / LLM_API_KEY / LLM_MODEL are not set in this environment",
    )
  }

  try {
    const result = await callSuggest(config, req, request.signal)

    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch (err) {
    if (err instanceof LlmNoDslError) {
      return problem(
        422,
        "no-dsl",
        "Could not translate to DSL",
        "Reword your request, e.g. include a DDBJ search target (organism / title / DB-specific field).",
      )
    }
    if (err instanceof LlmEmptyResponseError) {
      return problem(
        502,
        "empty-response",
        "Upstream returned an empty completion",
        "vLLM returned no content",
      )
    }
    if (err instanceof LlmUpstreamError) {
      return problem(
        502,
        "upstream-error",
        "Upstream LLM error",
        `vLLM responded with HTTP ${err.status}`,
      )
    }
    if (err instanceof DOMException && err.name === "TimeoutError") {
      return problem(504, "upstream-timeout", "Upstream LLM timeout", "vLLM did not respond in time")
    }
    if (err instanceof DOMException && err.name === "AbortError") {
      return problem(499, "client-abort", "Client aborted", "Client closed the connection")
    }
    const message = err instanceof Error ? err.message : "unknown error"

    return problem(502, "upstream-unreachable", "Upstream LLM unreachable", message)
  }
}

export const loader = (): Response =>
  problem(405, "method-not-allowed", "Method not allowed", "Use POST")
