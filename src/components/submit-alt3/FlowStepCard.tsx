import { ArrowRight, FileText, Pencil } from "lucide-react"

import { InternalExternalBadge } from "@/components/ui"
import cn from "@/components/ui/cn"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import type { FileEntry, FlowStep } from "@/types/submit-alt3"

interface Props {
  step: FlowStep
  stepNumber: number
  upstreamStepNumbers: ReadonlyMap<string, number>
  // 対象ファイル名表示用の id → FileEntry マップ
  fileById?: ReadonlyMap<string, FileEntry>
  onEditInputs?: (stepId: string) => void
  acknowledgedWarningCount?: number
}

const SERVICES_WITH_INPUT_EDITOR = ["dra", "mss", "dbcls-application"] as const

const isEditableService = (s: string): boolean =>
  (SERVICES_WITH_INPUT_EDITOR as readonly string[]).includes(s)

// 1 Step の表示カード (warnings 描画は FlowStepWarningBar に分離、Rule 14b)
// SSOT: docs/submit-alt3.md §6.1
const FlowStepCard = ({
  step,
  stepNumber,
  upstreamStepNumbers,
  fileById,
  onEditInputs,
  acknowledgedWarningCount = 0,
}: Props) => {
  const { t } = useDynamicTranslation()
  const title = t(`routes.submitAlt3.flowSteps.${step.service}.title`, {
    defaultValue: step.service,
  })

  const isExternal = step.badgeKind === "external"
  const linkLabel = step.intraDbInputs.linkLabel as string | undefined
  const url = step.intraDbInputs.url as string | undefined

  return (
    <article
      data-testid={`flow-step-card-${step.id}`}
      className={cn(
        "rounded-lg border bg-white p-5 shadow-sm",
        isExternal ? "border-amber-200" : "border-emerald-200",
      )}
    >
      <header className="mb-3 flex items-center gap-3">
        <span className="font-mono text-xs text-gray-400">
          Step {stepNumber}
        </span>
        <h3 className="flex-1 text-base font-semibold text-gray-800">
          {title}
        </h3>
        {isEditableService(step.service) && onEditInputs && (
          <button
            type="button"
            data-testid={`flow-step-edit-inputs-${step.id}`}
            onClick={() => onEditInputs(step.id)}
            className="inline-flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            <Pencil className="h-3 w-3" aria-hidden="true" />
            {t("routes.submitAlt3.flowStepCard.editStepInputs", {
              defaultValue: "Step 入力を編集",
            })}
          </button>
        )}
        <InternalExternalBadge
          venue={step.badgeKind}
          label={t(
            isExternal
              ? "routes.submitAlt3.flowCard.venue.external"
              : "routes.submitAlt3.flowCard.venue.internal",
          )}
        />
      </header>

      <dl className="space-y-2 text-xs">
        {step.issuedAccessionTypes.length > 0 && (
          <div className="flex items-baseline gap-2">
            <dt className="w-28 text-gray-500">
              {t("routes.submitAlt3.flowCard.issuesAccession")}
            </dt>
            <dd className="flex flex-wrap gap-1.5 font-mono text-gray-700">
              {step.issuedAccessionTypes.map((a) => (
                <code
                  key={a}
                  className="text-primary-700 rounded bg-gray-100 px-1.5 py-0.5"
                >
                  {a}
                </code>
              ))}
            </dd>
          </div>
        )}

        {step.upstreamStepIds.length > 0 && (
          <div className="flex items-baseline gap-2">
            <dt className="w-28 text-gray-500">
              {t("routes.submitAlt3.flowCard.dependsOn")}
            </dt>
            <dd className="flex flex-wrap items-center gap-1 text-gray-700">
              {step.upstreamStepIds.map((id, idx) => {
                const num = upstreamStepNumbers.get(id)

                return (
                  <span key={id} className="inline-flex items-center gap-1">
                    {idx > 0 && <span className="text-gray-300">·</span>}
                    <ArrowRight
                      className="h-3 w-3 text-gray-400"
                      aria-hidden="true"
                    />
                    <span>Step {num ?? "?"}</span>
                  </span>
                )
              })}
            </dd>
          </div>
        )}

        {step.targetFileIds.length > 0 && (
          <div className="flex items-baseline gap-2">
            <dt className="w-28 text-gray-500">
              {t("routes.submitAlt3.flowCard.targets")}
            </dt>
            <dd className="space-y-1 text-gray-700">
              <span>
                {t("routes.submitAlt3.flowCard.fileCount").replace(
                  /\{\{count\}\}/g,
                  String(step.targetFileIds.length),
                )}
              </span>
              <ul
                data-testid={`flow-step-target-files-${step.id}`}
                className="ml-0 space-y-0.5"
              >
                {step.targetFileIds.map((fid) => {
                  const f = fileById?.get(fid)
                  const display = f?.displayName ?? fid

                  return (
                    <li
                      key={fid}
                      className="flex items-center gap-1 font-mono text-[11px] text-gray-600"
                    >
                      <FileText
                        className="h-3 w-3 flex-shrink-0 text-gray-400"
                        aria-hidden="true"
                      />
                      <span className="break-all">{display}</span>
                    </li>
                  )
                })}
              </ul>
            </dd>
          </div>
        )}

        {url && (
          <div className="flex items-baseline gap-2">
            <dt className="w-28 text-gray-500">
              {t("routes.submitAlt3.flowStepCard.externalLink", {
                defaultValue: "外部リンク",
              })}
            </dt>
            <dd>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 underline hover:text-emerald-900"
              >
                {linkLabel ?? url}
              </a>
            </dd>
          </div>
        )}
      </dl>

      {step.notes.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-gray-600">
          {step.notes.map((n, idx) => {
            const isUrl = n.startsWith("http")
            const isI18nKey = n.startsWith("routes.submitAlt3.")

            return (
              <li key={idx} className="flex gap-1.5">
                <span className="text-gray-400">·</span>
                {isUrl
                  ? (
                    <a
                      href={n}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-emerald-700 underline hover:text-emerald-900"
                    >
                      {n}
                    </a>
                  )
                  : isI18nKey
                    ? <span>{t(n, { defaultValue: n })}</span>
                    : <span>{n}</span>}
              </li>
            )
          })}
        </ul>
      )}

      {acknowledgedWarningCount > 0 && (
        <p className="mt-2 text-[10px] text-gray-500">
          {t("routes.submitAlt3.flowStepCard.warningAcknowledgedSummary", {
            defaultValue: "{{count}} 件の警告を確認済み",
            count: String(acknowledgedWarningCount),
          })}
        </p>
      )}
    </article>
  )
}

export default FlowStepCard
