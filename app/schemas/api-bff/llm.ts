import { z } from "zod"

export const LlmHealth = z.discriminatedUnion("status", [
  z.object({ status: z.literal("unset") }),
  z.object({ status: z.literal("ok"), model: z.string() }),
  z.object({ status: z.literal("unreachable"), reason: z.string() }),
])
export type LlmHealth = z.infer<typeof LlmHealth>

export const ADVANCED_FIELDS = [
  "identifier",
  "title",
  "description",
  "organism_id",
  "organism_name",
  "accessibility",
  "date_published",
  "date_modified",
  "date_created",
  "submitter",
  "publication",
] as const

export type AdvancedField = typeof ADVANCED_FIELDS[number]

export const ADVANCED_OPS = ["eq", "contains", "wildcard", "between"] as const

export type AdvancedOp = typeof ADVANCED_OPS[number]

export const SCALAR_OPS = ["eq", "contains", "wildcard"] as const

// The search assistant emits a DSL string that the BFF validates into a
// ParseNode AST (the `event: done` payload); see docs/llm.md. There is no flat
// proposal schema — the AST is the shared shape (`~/lib/api` ParseNode).
