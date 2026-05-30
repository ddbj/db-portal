import type { FlowStep, Service } from "~/schemas/submit"
import { Button } from "~/ui"

import { StepBadge } from "../components/step-badge"
import { scrollToStep } from "./anchor"

type FlowOverviewProps = {
  steps: readonly FlowStep[]
  serviceName: (service: Service) => string
  fileCountLabel: (count: number) => string
  gotoLabel: (serviceName: string) => string
}

// 登録フローを等幅のステーション grid で俯瞰する帯。ステーションは pane 幅を埋めるよう
// 伸び、折り返し行も左端が揃う。ステーションを選ぶと対応する FlowStepCard へ scroll する。
// 番号 badge が順序を表し、状態・source は持たない。
export const FlowOverview = ({
  steps,
  serviceName,
  fileCountLabel,
  gotoLabel,
}: FlowOverviewProps) => {
  if (steps.length === 0) return null

  return (
    <ol
      data-testid="flow-overview"
      className="grid grid-cols-2 sm:grid-cols-3 gap-2 m-0 list-none p-0"
    >
      {steps.map((step, i) => {
        const name = serviceName(step.service)
        const count = step.scope.entryIds.length

        return (
          <li key={step.id}>
            <Button
              block
              kind="secondary"
              size="sm"
              onClick={() => scrollToStep(i)}
              aria-label={gotoLabel(name)}
            >
              <StepBadge index={i + 1} pending={false} />
              <span className="flex-1 min-w-0 text-fs-body-sm font-semibold text-ink leading-snug truncate py-0.5">
                {name}
              </span>
              {count > 0 && (
                <span className="font-mono text-fs-micro text-ink-soft shrink-0">
                  {fileCountLabel(count)}
                </span>
              )}
            </Button>
          </li>
        )
      })}
    </ol>
  )
}
