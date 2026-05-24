import type { FlowStep } from "~/schemas/submit"
import { SERVICE_PHYSICAL_ORDER } from "~/schemas/submit"

const rankOf = (service: FlowStep["service"]): number => {
  const idx = SERVICE_PHYSICAL_ORDER.indexOf(service)
  return idx === -1 ? SERVICE_PHYSICAL_ORDER.length : idx
}

export const byServicePhysicalOrder = (a: FlowStep, b: FlowStep): number => {
  const ra = rankOf(a.service)
  const rb = rankOf(b.service)
  if (ra !== rb) return ra - rb
  return a.id.localeCompare(b.id)
}
