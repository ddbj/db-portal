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

export const ASSISTANT_COMBINATORS = ["AND", "OR"] as const

export type AssistantCombinator = typeof ASSISTANT_COMBINATORS[number]

export const AssistantConditionSchema = z.discriminatedUnion("op", [
  z.object({
    field: z.enum(ADVANCED_FIELDS),
    op: z.enum(SCALAR_OPS),
    value: z.string().min(1),
  }),
  z.object({
    field: z.enum(ADVANCED_FIELDS),
    op: z.literal("between"),
    from: z.string().min(1),
    to: z.string().min(1),
  }),
])
export type AssistantCondition = z.infer<typeof AssistantConditionSchema>

export const AssistantProposalSchema = z.object({
  combinator: z.enum(ASSISTANT_COMBINATORS),
  conditions: z.array(AssistantConditionSchema).min(1),
})
export type AssistantProposal = z.infer<typeof AssistantProposalSchema>
