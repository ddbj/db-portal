import { buildUserPrompt, getSystemPrompt } from "./prompts"
import type { SuggestRequest, SuggestSuccess } from "./types"
import { SUGGEST_NO_DSL_MARKER } from "./types"

export interface LlmConfig {
  baseUrl: string
  apiKey: string
  model: string
  timeoutMs: number
}

export const readLlmConfig = (): LlmConfig | null => {
  const baseUrl = process.env.LLM_BASE_URL?.trim() ?? ""
  const apiKey = process.env.LLM_API_KEY?.trim() ?? ""
  const model = process.env.LLM_MODEL?.trim() ?? ""
  if (baseUrl === "" || apiKey === "" || model === "") return null

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    apiKey,
    model,
    timeoutMs: 30_000,
  }
}

export class LlmUpstreamError extends Error {
  readonly status: number
  readonly upstreamBody: string | null

  constructor(status: number, upstreamBody: string | null, message: string) {
    super(message)
    this.name = "LlmUpstreamError"
    this.status = status
    this.upstreamBody = upstreamBody
  }
}

export class LlmEmptyResponseError extends Error {
  constructor() {
    super("LLM returned an empty completion")
    this.name = "LlmEmptyResponseError"
  }
}

export class LlmNoDslError extends Error {
  constructor() {
    super("LLM declined to translate the input to DSL")
    this.name = "LlmNoDslError"
  }
}

interface ChatChoice {
  message?: { content?: string | null }
  finish_reason?: string
}

interface ChatUsage {
  prompt_tokens?: number
  completion_tokens?: number
}

interface ChatResponse {
  choices?: readonly ChatChoice[]
  usage?: ChatUsage
}

const stripDsl = (raw: string): string => {
  let text = raw.trim()
  if (text.startsWith("```")) {
    const fenceClose = text.indexOf("\n")
    if (fenceClose !== -1) {
      const body = text.slice(fenceClose + 1)
      const closeIdx = body.lastIndexOf("```")
      text = (closeIdx === -1 ? body : body.slice(0, closeIdx)).trim()
    }
  }
  text = text.replace(/^`+|`+$/g, "").trim()
  const newlineIdx = text.indexOf("\n")
  if (newlineIdx !== -1) text = text.slice(0, newlineIdx).trim()

  return text
}

export const callSuggest = async (
  config: LlmConfig,
  req: SuggestRequest,
  signal: AbortSignal,
): Promise<SuggestSuccess> => {
  const start = Date.now()
  const url = `${config.baseUrl}/v1/chat/completions`
  const body = JSON.stringify({
    model: config.model,
    messages: [
      { role: "system", content: getSystemPrompt(req.task, req.lang) },
      { role: "user", content: buildUserPrompt(req) },
    ],
    temperature: 0.1,
    max_tokens: 256,
    stream: false,
  })

  const timeout = AbortSignal.timeout(config.timeoutMs)
  const combined = AbortSignal.any([signal, timeout])

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body,
    signal: combined,
  })

  if (!res.ok) {
    let upstream: string | null = null
    try {
      upstream = await res.text()
    } catch {
      upstream = null
    }
    throw new LlmUpstreamError(
      res.status,
      upstream,
      `vLLM responded with HTTP ${res.status}`,
    )
  }

  const data = (await res.json()) as ChatResponse
  const choice = data.choices?.[0]
  const content = choice?.message?.content?.trim() ?? ""
  if (content === "") throw new LlmEmptyResponseError()

  const dsl = stripDsl(content)
  if (dsl === "" || dsl === SUGGEST_NO_DSL_MARKER) {
    throw new LlmNoDslError()
  }

  return {
    dsl,
    model: config.model,
    totalMs: Date.now() - start,
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
  }
}
