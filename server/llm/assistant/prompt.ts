import type { ChatMessage } from "../client"

const ADVANCED_FIELDS = [
  "organism",
  "identifier",
  "title",
  "description",
  "date_published",
  "date_modified",
  "date_created",
] as const

const ADVANCED_OPS = ["eq", "contains", "wildcard", "between"] as const

const COMBINATORS = ["AND", "OR"] as const

const FEW_SHOT_EXAMPLES: { user: string; assistant: string }[] = [
  {
    user: "human breast cancer rna-seq from 2023",
    assistant: JSON.stringify({
      combinator: "AND",
      conditions: [
        { field: "organism", op: "eq", value: "Homo sapiens" },
        { field: "description", op: "contains", value: "breast cancer" },
        { field: "description", op: "contains", value: "RNA-seq" },
        { field: "date_published", op: "between", value: "2023-01-01..2023-12-31" },
      ],
    }),
  },
  {
    user: "mouse OR rat liver studies",
    assistant: JSON.stringify({
      combinator: "OR",
      conditions: [
        { field: "organism", op: "eq", value: "Mus musculus" },
        { field: "organism", op: "eq", value: "Rattus norvegicus" },
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
    {
      "field": ${ADVANCED_FIELDS.map((f) => `"${f}"`).join(" | ")},
      "op": ${ADVANCED_OPS.map((o) => `"${o}"`).join(" | ")},
      "value": "<string>"
    }
  ]
}

Rules:
- field MUST be one of the listed identifiers (no synonyms, no invented names).
- op MUST be one of the listed operators.
- combinator MUST be ${COMBINATORS.map((c) => `"${c}"`).join(" or ")}.
- "between" op uses value formatted as "<from>..<to>" (ISO 8601 dates, inclusive).
- "wildcard" op may use "*" as a glob.
- Map organism mentions to the binomial Latin name when possible (e.g. "human" -> "Homo sapiens").
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

export { ADVANCED_FIELDS, ADVANCED_OPS, COMBINATORS }
