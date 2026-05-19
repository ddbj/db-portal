// FlowStep の descriptionKey / serviceUrl を補強する Phase 3 後処理
// SSOT: docs/submit-alt3.md §6.1 (Service 説明 + 遷移ボタン必須)

import { SERVICE_URLS } from "@/lib/mock-data/submit-alt3"
import type { FlowStep } from "@/types/submit-alt3"

export const enrichStepsWithDescriptions = (steps: FlowStep[]): FlowStep[] =>
  steps.map((step) => {
    const serviceUrl = step.serviceUrl ?? SERVICE_URLS[step.service]

    return {
      ...step,
      descriptionKey:
        step.descriptionKey ?? `routes.submitAlt3.flowSteps.${step.service}`,
      ...(serviceUrl ? { serviceUrl } : {}),
    }
  })
