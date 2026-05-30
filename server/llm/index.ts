export { extractDsl, stripUnsupported } from "./assistant/dsl"
export { type AstOutcome, parseModelOutput } from "./assistant/parse"
export {
  type AssistantPromptInput,
  buildAssistantMessages,
} from "./assistant/prompt"
export { makeHandleSearchAssistant } from "./assistant/route"
export {
  type ParseAstOutcome,
  parseDslToAst,
  type SearchApiDeps,
  serializeAstToDsl,
} from "./assistant/search-api"
export {
  callVllmModels,
  callVllmStreamRaw,
  type ChatCompletionRequest,
  type ChatMessage,
  createLlmClient,
  llmAuthHeader,
  type LlmClient,
  type LlmClientOverrides,
} from "./client"
export {
  getActiveHealth,
  type HealthMonitor,
  type LlmHealth,
  setActiveHealth,
  startHealthMonitor,
} from "./health"
export {
  createRateLimiter,
  getActiveRateLimiter,
  type LimitDecision,
  type RateLimitConfig,
  type RateLimiter,
  setActiveRateLimiter,
} from "./rate-limit"
export { redactUserInput } from "./redaction"
export {
  openSseStream,
  readVllmStream,
  type SseStream,
} from "./sse"
