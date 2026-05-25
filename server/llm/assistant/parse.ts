import {
  type AssistantProposal,
  AssistantProposalSchema,
} from "../../../app/schemas/api-bff/llm"

export { type AssistantProposal, AssistantProposalSchema }

const extractJson = (text: string): string | undefined => {
  const trimmed = text.trim()
  if (trimmed.startsWith("{")) return trimmed
  const start = trimmed.indexOf("{")
  if (start === -1) return undefined
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i]
    if (escape) {
      escape = false
      continue
    }
    if (inString) {
      if (ch === "\\") escape = true
      else if (ch === "\"") inString = false
      continue
    }
    if (ch === "\"") inString = true
    else if (ch === "{") depth += 1
    else if (ch === "}") {
      depth -= 1
      if (depth === 0) return trimmed.slice(start, i + 1)
    }
  }

  return undefined
}

export type ParseOutcome =
  | { ok: true; proposal: AssistantProposal }
  | { ok: false; code: "no_json" | "invalid_json" | "schema_violation"; message: string }

export const parseAssistantOutput = (raw: string): ParseOutcome => {
  const candidate = extractJson(raw)
  if (!candidate) {
    return { ok: false, code: "no_json", message: "model output did not contain a JSON object" }
  }
  let json: unknown
  try {
    json = JSON.parse(candidate)
  } catch (error) {
    return {
      ok: false,
      code: "invalid_json",
      message: error instanceof Error ? error.message : "JSON parse failed",
    }
  }
  const parsed = AssistantProposalSchema.safeParse(json)
  if (!parsed.success) {
    return {
      ok: false,
      code: "schema_violation",
      message: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
    }
  }

  return { ok: true, proposal: parsed.data }
}
