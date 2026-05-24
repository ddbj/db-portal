import type { ServerEnv } from "../lib/env"

export type LlmClient = {
  available: boolean
  baseUrl: string | undefined
  model: string
  apiKey: string | undefined
  timeoutMs: number
  fetchImpl: typeof fetch
}

export type LlmClientOverrides = {
  fetchImpl?: typeof fetch
}

export const createLlmClient = (env: ServerEnv, overrides: LlmClientOverrides = {}): LlmClient => ({
  available: Boolean(env.DB_PORTAL_LLM_BASE_URL),
  baseUrl: env.DB_PORTAL_LLM_BASE_URL,
  model: env.DB_PORTAL_LLM_MODEL,
  apiKey: env.DB_PORTAL_LLM_API_KEY,
  timeoutMs: env.DB_PORTAL_LLM_TIMEOUT_MS,
  fetchImpl: overrides.fetchImpl ?? fetch,
})

export const llmAuthHeader = (client: LlmClient): Record<string, string> =>
  client.apiKey ? { Authorization: `Bearer ${client.apiKey}` } : {}

export type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

export type ChatCompletionRequest = {
  messages: ChatMessage[]
  temperature?: number
  maxTokens?: number
  stream?: boolean
}

export const callVllmStreamRaw = async (
  client: LlmClient,
  request: ChatCompletionRequest,
  signal: AbortSignal,
): Promise<Response> => {
  if (!client.baseUrl) {
    throw new Error("LLM base URL is not configured")
  }
  const body = {
    model: client.model,
    stream: request.stream ?? true,
    messages: request.messages,
    ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
    ...(request.maxTokens !== undefined ? { max_tokens: request.maxTokens } : {}),
  }

  return client.fetchImpl(`${client.baseUrl.replace(/\/$/, "")}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      ...llmAuthHeader(client),
    },
    body: JSON.stringify(body),
    signal,
  })
}

export const callVllmModels = async (client: LlmClient): Promise<{ ok: boolean; reason?: string }> => {
  if (!client.baseUrl) return { ok: false, reason: "unset" }
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), Math.min(client.timeoutMs, 10_000))
    try {
      const response = await client.fetchImpl(
        `${client.baseUrl.replace(/\/$/, "")}/v1/models`,
        { headers: llmAuthHeader(client), signal: controller.signal },
      )
      if (!response.ok) return { ok: false, reason: `status ${response.status}` }
      const body = (await response.json()) as { data?: unknown }
      if (!Array.isArray(body.data)) return { ok: false, reason: "invalid models response" }
      const ids = body.data
        .filter((m): m is { id: string } => typeof m === "object" && m !== null && typeof (m as { id?: unknown }).id === "string")
        .map((m) => m.id)
      if (!ids.includes(client.model)) return { ok: false, reason: `model ${client.model} not served` }

      return { ok: true }
    } finally {
      clearTimeout(timer)
    }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : "network error" }
  }
}
