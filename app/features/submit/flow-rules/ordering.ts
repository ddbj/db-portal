import type { FlowStep } from "~/schemas/submit"
import { SERVICE_DEPENDENCY_ORDER } from "~/schemas/submit"

const rankOf = (service: FlowStep["service"]): number => {
  const idx = SERVICE_DEPENDENCY_ORDER.indexOf(service)
  return idx === -1 ? SERVICE_DEPENDENCY_ORDER.length : idx
}

// FlowStep をステップ依存順 (SERVICE_DEPENDENCY_ORDER) で並べる。前提 step が依存 step より前に出る。
// 同 service は id 昇順 (localeCompare) で安定化する。
export const byServiceDependencyOrder = (a: FlowStep, b: FlowStep): number => {
  const ra = rankOf(a.service)
  const rb = rankOf(b.service)
  if (ra !== rb) return ra - rb
  return a.id.localeCompare(b.id)
}
