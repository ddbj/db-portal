import { AlertTriangle, Check, RotateCcw } from "lucide-react"

import cn from "@/components/ui/cn"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import type { ChipAxis, FlowWarning } from "@/types/submit-alt3"

interface Props {
  stepId: string
  warnings: readonly FlowWarning[]
  onAcknowledge: (warningId: string) => void
  onRestore: (warningId: string) => void
  onFocusChip?: (
    fileId: string,
    axis: ChipAxis,
    suggestedValue?: string,
  ) => void
  onFocusStepInput?: (stepId: string, field: string) => void
}

// Rule 14b: Step 上に Step 単位の warning bar
// SSOT: docs/submit-alt3-flow-rules.md §8.1 Rule 14b
const FlowStepWarningBar = ({
  stepId,
  warnings,
  onAcknowledge,
  onRestore,
  onFocusChip,
  onFocusStepInput,
}: Props) => {
  const { t } = useDynamicTranslation()

  if (warnings.length === 0) return null

  return (
    <div
      data-testid={`flow-step-warning-bar-${stepId}`}
      className="mb-2 space-y-1.5"
    >
      {warnings.map((w) => {
        const params = w.messageParams ?? {}
        const hints = w.actionHints
        const isAcknowledged = w.acknowledged === true

        return (
          <div
            key={w.id}
            data-testid={`flow-warning-${w.id}`}
            className={cn(
              "flex items-start gap-2 rounded border px-3 py-2 text-xs",
              isAcknowledged
                ? "border-gray-200 bg-gray-50 text-gray-500"
                : w.severity === "info"
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-rose-300 bg-rose-50 text-rose-700",
            )}
          >
            <AlertTriangle
              className={cn(
                "mt-0.5 h-3.5 w-3.5 flex-shrink-0",
                isAcknowledged ? "text-gray-400" : undefined,
              )}
              aria-hidden="true"
            />
            <div className="flex-1 space-y-1.5">
              <p className="leading-relaxed">
                {t(w.messageKey, {
                  defaultValue: w.messageKey,
                  ...params,
                })}
                {isAcknowledged && (
                  <span className="ml-2 text-[10px] tracking-wide uppercase">
                    {t("routes.submitAlt3.flowStepCard.warningAcknowledged")}
                  </span>
                )}
              </p>

              {!isAcknowledged && (
                <div className="flex flex-wrap gap-1.5">
                  {(() => {
                    const fileId = hints?.chipFileId
                    const axis = hints?.chipAxis
                    if (!fileId || !axis || !onFocusChip) return null

                    return (
                      <button
                        type="button"
                        className="rounded border border-rose-300 bg-white px-2 py-0.5 font-medium text-rose-700 transition hover:bg-rose-100"
                        onClick={() =>
                          onFocusChip(fileId, axis, hints?.suggestedChipValue)
                        }
                      >
                        {t(
                          "routes.submitAlt3.flowStepCard.warningActions.fixChip",
                        )}
                      </button>
                    )
                  })()}
                  {(() => {
                    const field = hints?.stepInputField
                    if (!field || !onFocusStepInput) return null

                    return (
                      <button
                        type="button"
                        className="rounded border border-rose-300 bg-white px-2 py-0.5 font-medium text-rose-700 transition hover:bg-rose-100"
                        onClick={() => onFocusStepInput(stepId, field)}
                      >
                        {t(
                          "routes.submitAlt3.flowStepCard.warningActions.editStepInput",
                        )}
                      </button>
                    )
                  })()}
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-0.5 font-medium text-gray-600 transition hover:bg-gray-100"
                    onClick={() => onAcknowledge(w.id)}
                  >
                    <Check className="h-3 w-3" aria-hidden="true" />
                    {t(
                      "routes.submitAlt3.flowStepCard.warningActions.acknowledge",
                    )}
                  </button>
                </div>
              )}

              {isAcknowledged && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-0.5 font-medium text-gray-600 transition hover:bg-gray-100"
                  onClick={() => onRestore(w.id)}
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  {t(
                    "routes.submitAlt3.flowStepCard.warningActions.restore",
                  )}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default FlowStepWarningBar
