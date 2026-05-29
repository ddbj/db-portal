import { z } from "zod"

import { Service } from "./service"

export const FlowNoteKind = z.enum(["info", "warning", "error"])
export type FlowNoteKind = z.infer<typeof FlowNoteKind>

export const FlowStepNote = z.object({
  kind: FlowNoteKind,
  messageKey: z.string().min(1),
})
export type FlowStepNote = z.infer<typeof FlowStepNote>

export const FlowStepScope = z.object({
  groupIds: z.array(z.string().min(1)).default([]),
  entryIds: z.array(z.string().min(1)).default([]),
})
export type FlowStepScope = z.infer<typeof FlowStepScope>

// step の導出元。フロー・エクスプローラの由来バッジが参照する
export const FlowStepOrigin = z.enum(["tier1", "tier2", "recipe"])
export type FlowStepOrigin = z.infer<typeof FlowStepOrigin>

export const FlowStep = z.object({
  id: z.string().min(1),
  service: Service,
  origin: FlowStepOrigin,
  scope: FlowStepScope,
  notes: z.array(FlowStepNote).default([]),
})
export type FlowStep = z.infer<typeof FlowStep>
