import type { FlowStep, ServiceBadgeColor } from "~/schemas/submit"
import { serviceBadgeColor } from "~/schemas/submit"

export type { ServiceBadgeColor }

export const stepBadgeColor = (step: FlowStep): ServiceBadgeColor =>
  serviceBadgeColor({
    service: step.service,
    hasWarningOrError: step.notes.some((n) => n.kind === "warning" || n.kind === "error"),
  })
