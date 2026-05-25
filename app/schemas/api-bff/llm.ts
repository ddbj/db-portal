import { z } from "zod"

export const LlmHealth = z.discriminatedUnion("status", [
  z.object({ status: z.literal("unset") }),
  z.object({ status: z.literal("ok"), model: z.string() }),
  z.object({ status: z.literal("unreachable"), reason: z.string() }),
])
export type LlmHealth = z.infer<typeof LlmHealth>

export const AssistantConditionWire = z.object({
  field: z.string().min(1),
  op: z.string().min(1),
  value: z.string().min(1),
})
export type AssistantConditionWire = z.infer<typeof AssistantConditionWire>

export const AssistantProposalWire = z.object({
  combinator: z.enum(["AND", "OR"]),
  conditions: z.array(AssistantConditionWire).min(1),
})
export type AssistantProposalWire = z.infer<typeof AssistantProposalWire>
