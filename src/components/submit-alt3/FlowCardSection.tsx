import { useState } from "react"

import { Callout, Heading } from "@/components/ui"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import type {
  ChipAxis,
  FlowCard,
  ServiceKind,
} from "@/types/submit-alt3"

import FlowStepCard from "./FlowStepCard"
import FlowStepWarningBar from "./FlowStepWarningBar"
import StepInputPopover from "./StepInputPopover"

interface Props {
  flowCard: FlowCard
  hasFiles: boolean
  onUpdateStepInput: (
    stepId: string,
    serviceKind: ServiceKind,
    values: Record<string, unknown>,
  ) => void
  onAcknowledgeWarning: (warningId: string) => void
  onRestoreWarning: (warningId: string) => void
  onFocusChip: (
    fileId: string,
    axis: ChipAxis,
    suggestedValue?: string,
  ) => void
}

// Section B: 登録フローカード列
// SSOT: docs/submit-alt3.md §6
const FlowCardSection = ({
  flowCard,
  hasFiles,
  onUpdateStepInput,
  onAcknowledgeWarning,
  onRestoreWarning,
  onFocusChip,
}: Props) => {
  const { t } = useDynamicTranslation()

  // Step ID -> 1-based 表示番号 (upstream 解決用)
  const stepNumbers = new Map<string, number>()
  flowCard.steps.forEach((s, idx) => stepNumbers.set(s.id, idx + 1))

  // StepInputPopover の open 管理: { stepId, focusField? }
  const [openInput, setOpenInput] = useState<
    { stepId: string; focusField?: string } | null
  >(null)

  const handleEditInputs = (stepId: string) => {
    setOpenInput((prev) =>
      prev?.stepId === stepId && prev.focusField === undefined
        ? null
        : { stepId },
    )
  }

  const handleFocusStepInput = (stepId: string, field: string) => {
    setOpenInput({ stepId, focusField: field })
  }

  return (
    <section
      className="space-y-4"
      aria-labelledby="submit-alt3-section-b"
      data-testid="submit-alt3-flow-section"
    >
      <Heading level={2} id="submit-alt3-section-b">
        {t("routes.submitAlt3.sections.flowCard")}
      </Heading>

      {!hasFiles && (
        <Callout type="info">
          {t("routes.submitAlt3.flowCard.emptyHint")}
        </Callout>
      )}

      {flowCard.globalWarnings.length > 0 && (
        <Callout type="warning">
          <ul className="space-y-0.5 text-sm">
            {flowCard.globalWarnings.map((w) => (
              <li key={w.id}>
                {t(w.messageKey, {
                  defaultValue: w.messageKey,
                  ...(w.messageParams ?? {}),
                })}
              </li>
            ))}
          </ul>
        </Callout>
      )}

      {hasFiles && flowCard.steps.length === 0 && (
        <Callout type="info">
          {t("routes.submitAlt3.flowCard.noStepsYet")}
        </Callout>
      )}

      <ol className="space-y-3" data-testid="submit-alt3-flow-steps">
        {flowCard.steps.map((step, idx) => {
          const activeWarnings = step.warnings.filter(
            (w) => w.acknowledged !== true,
          )
          const acknowledgedCount = step.warnings.length - activeWarnings.length
          const isInputOpen = openInput?.stepId === step.id

          return (
            <li key={step.id} data-testid={`flow-step-${step.id}`}>
              <FlowStepWarningBar
                stepId={step.id}
                warnings={step.warnings}
                onAcknowledge={onAcknowledgeWarning}
                onRestore={onRestoreWarning}
                onFocusChip={onFocusChip}
                onFocusStepInput={handleFocusStepInput}
              />
              <FlowStepCard
                step={step}
                stepNumber={idx + 1}
                upstreamStepNumbers={stepNumbers}
                onEditInputs={handleEditInputs}
                acknowledgedWarningCount={acknowledgedCount}
              />
              {isInputOpen && (
                <StepInputPopover
                  step={step}
                  {...(openInput?.focusField !== undefined
                    ? { focusField: openInput.focusField }
                    : {})}
                  onUpdate={onUpdateStepInput}
                  onClose={() => setOpenInput(null)}
                />
              )}
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default FlowCardSection
