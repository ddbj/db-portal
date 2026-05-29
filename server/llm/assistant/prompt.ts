import {
  ADVANCED_FIELDS,
  ASSISTANT_COMBINATORS,
} from "../../../app/schemas/api-bff/llm"
import type { ChatMessage } from "../client"

const FEW_SHOT_EXAMPLES: { user: string; assistant: string }[] = [
  {
    user: "human breast cancer rna-seq from 2023",
    assistant: JSON.stringify({
      combinator: "AND",
      conditions: [
        { field: "organism_name", op: "eq", value: "Homo sapiens" },
        { field: "description", op: "contains", value: "breast cancer" },
        { field: "description", op: "contains", value: "RNA-seq" },
        { field: "date_published", op: "between", from: "2023-01-01", to: "2023-12-31" },
      ],
    }),
  },
  {
    user: "mouse OR rat liver studies",
    assistant: JSON.stringify({
      combinator: "OR",
      conditions: [
        { field: "organism_name", op: "eq", value: "Mus musculus" },
        { field: "organism_name", op: "eq", value: "Rattus norvegicus" },
      ],
    }),
  },
  {
    user: "studies whose identifier starts with PRJNA",
    assistant: JSON.stringify({
      combinator: "AND",
      conditions: [
        { field: "identifier", op: "wildcard", value: "PRJNA*" },
      ],
    }),
  },
]

const SYSTEM_PROMPT = `You convert natural-language descriptions into DDBJ portal advanced-search filters.

Output ONLY a single JSON object that matches this schema. Do not include any commentary, prose, or fences.

{
  "combinator": "AND" | "OR",
  "conditions": [
    // value condition:
    { "field": <field>, "op": "eq" | "contains" | "wildcard", "value": "<string>" },
    // range condition (date fields only):
    { "field": <date field>, "op": "between", "from": "<YYYY-MM-DD>", "to": "<YYYY-MM-DD>" }
  ]
}

field MUST be one of: ${ADVANCED_FIELDS.map((f) => `"${f}"`).join(", ")}.

Rules:
- field MUST be one of the listed identifiers (no synonyms, no invented names).
- combinator MUST be ${ASSISTANT_COMBINATORS.map((c) => `"${c}"`).join(" or ")}.
- "identifier" and "organism_id" accept op "eq" or "wildcard".
- "title", "description", "organism_name", "submitter", "publication" accept op "eq" or "contains".
- "date_published", "date_modified", "date_created" accept only op "between" with "from"/"to" (ISO 8601 dates, inclusive); never use "value" for these.
- "wildcard" op may use "*" as a glob.
- Map organism mentions to "organism_name" with the binomial Latin name (e.g. "human" -> "Homo sapiens"), or to "organism_id" with the NCBI taxonomy ID (e.g. human -> "9606").
- "accessibility" accepts only "public-access" or "controlled-access".
- Always include at least one condition.`

export type AssistantPromptInput = {
  userInput: string
}

export const buildAssistantMessages = ({ userInput }: AssistantPromptInput): ChatMessage[] => {
  const messages: ChatMessage[] = [{ role: "system", content: SYSTEM_PROMPT }]
  for (const example of FEW_SHOT_EXAMPLES) {
    messages.push({ role: "user", content: example.user })
    messages.push({ role: "assistant", content: example.assistant })
  }
  messages.push({ role: "user", content: userInput })

  return messages
}

