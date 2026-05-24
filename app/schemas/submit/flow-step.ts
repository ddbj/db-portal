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

export const FlowStep = z.object({
  id: z.string().min(1),
  service: Service,
  scope: FlowStepScope,
  notes: z.array(FlowStepNote).default([]),
})
export type FlowStep = z.infer<typeof FlowStep>
