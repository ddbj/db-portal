import { X } from "lucide-react"
import { useEffect, useRef } from "react"

import { Select } from "@/components/ui"
import cn from "@/components/ui/cn"
import { useDynamicTranslation } from "@/i18n/useDynamicTranslation"
import {
  DRA_ANALYSIS_TYPE_VALUES,
  DRA_INSTRUMENT_VALUES,
  DRA_LIBRARY_SELECTION_VALUES,
  DRA_LIBRARY_SOURCE_VALUES,
  DRA_LIBRARY_STRATEGY_VALUES,
  DRA_PLATFORM_VALUES,
  type DraPlatform,
  MSS_DATATYPE_VALUES,
  MSS_DIVISION_VALUES,
  MSS_KEYWORDS_VOCABULARY,
} from "@/lib/mock-data/submit-alt3"
import type { FlowStep, ServiceKind } from "@/types/submit-alt3"

interface Props {
  step: FlowStep
  focusField?: string
  onUpdate: (
    stepId: string,
    serviceKind: ServiceKind,
    values: Record<string, unknown>,
  ) => void
  onClose: () => void
}

const buildOptions = (values: readonly string[]): { value: string; label: string }[] =>
  values.map((v) => ({ value: v, label: v }))

// keywords は `"Third Party Data; TPA; TPA:assembly."` のような ";" 連結文字列で保持される。
// multi-select 用の string[] に変換する際は `;` で分割 + trim + 末尾の "." を取り除く。
const parseKeywordsString = (raw: unknown): string[] => {
  if (typeof raw !== "string" || raw.trim() === "") return []
  const vocab = new Set<string>(MSS_KEYWORDS_VOCABULARY)
  const trimmedTail = raw.replace(/\.$/, "")

  return trimmedTail
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s !== "" && vocab.has(s))
}

// 出力は `; ` 連結 + 末尾 "." (Rule 7a auto-append と一致するフォーマット)。
// vocabulary 外 (自由記述) はユーザー編集対象外とし、ここでは保持しない。
// (vocabulary 外を保持したいケースは別 textarea の本番 UX 課題、open-questions §10.2)
const joinKeywords = (selected: readonly string[]): string =>
  selected.length === 0 ? "" : `${selected.join("; ")}.`

// Step pulldown 入力 inline popover (Rule 14a/14b で参照される入力源)
// SSOT: docs/submit-alt3-tags.md §5.3 + docs/submit-alt3-flow-rules.md §8.1 Rule 13/14
const StepInputPopover = ({ step, focusField, onUpdate, onClose }: Props) => {
  const { t } = useDynamicTranslation()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    const t1 = setTimeout(() => {
      window.addEventListener("mousedown", handler)
    }, 0)
    window.addEventListener("keydown", esc)

    return () => {
      clearTimeout(t1)
      window.removeEventListener("mousedown", handler)
      window.removeEventListener("keydown", esc)
    }
  }, [onClose])

  const inputs = step.intraDbInputs
  const setValue = (key: string, value: string) => {
    onUpdate(step.id, step.service, { [key]: value })
  }

  const fieldClass = (field: string): string =>
    cn(
      "rounded p-1.5",
      focusField === field ? "bg-rose-50 ring-2 ring-rose-300" : undefined,
    )

  return (
    <div
      ref={ref}
      data-testid={`step-input-popover-${step.id}`}
      className="z-30 mt-2 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-inner"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-gray-700">
          {t("routes.submitAlt3.flowStepCard.stepInputsHeading", {
            defaultValue: "Step 入力",
          })}
        </h4>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-gray-400 hover:bg-gray-200"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {step.service === "dra" && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className={fieldClass("libraryStrategy")}>
            <label className="block text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
              Library Strategy
            </label>
            <Select
              selectSize="sm"
              options={[
                { value: "", label: "—" },
                ...buildOptions(DRA_LIBRARY_STRATEGY_VALUES),
              ]}
              value={(inputs.libraryStrategy as string) ?? ""}
              onChange={(e) => setValue("libraryStrategy", e.target.value)}
            />
          </div>
          <div className={fieldClass("librarySource")}>
            <label className="block text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
              Library Source
            </label>
            <Select
              selectSize="sm"
              options={[
                { value: "", label: "—" },
                ...buildOptions(DRA_LIBRARY_SOURCE_VALUES),
              ]}
              value={(inputs.librarySource as string) ?? ""}
              onChange={(e) => setValue("librarySource", e.target.value)}
            />
          </div>
          <div className={fieldClass("librarySelection")}>
            <label className="block text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
              Library Selection
            </label>
            <Select
              selectSize="sm"
              options={[
                { value: "", label: "—" },
                ...buildOptions(DRA_LIBRARY_SELECTION_VALUES),
              ]}
              value={(inputs.librarySelection as string) ?? ""}
              onChange={(e) => setValue("librarySelection", e.target.value)}
            />
          </div>
          <div className={fieldClass("platform")}>
            <label className="block text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
              Platform
            </label>
            <Select
              selectSize="sm"
              options={[
                { value: "", label: "—" },
                ...buildOptions(DRA_PLATFORM_VALUES),
              ]}
              value={(inputs.platform as string) ?? ""}
              onChange={(e) => setValue("platform", e.target.value)}
            />
          </div>
          <div className={fieldClass("instrument")}>
            <label className="block text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
              Instrument
            </label>
            <Select
              selectSize="sm"
              options={[
                { value: "", label: "—" },
                ...buildOptions(
                  inputs.platform
                    ? DRA_INSTRUMENT_VALUES[inputs.platform as DraPlatform] ?? []
                    : [],
                ),
              ]}
              value={(inputs.instrument as string) ?? ""}
              onChange={(e) => setValue("instrument", e.target.value)}
            />
          </div>
          {inputs.analysisKind === "Analysis" && (
            <div className={fieldClass("analysisType")}>
              <label className="block text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
                Analysis Type
              </label>
              <Select
                selectSize="sm"
                options={[
                  { value: "", label: "—" },
                  ...buildOptions(DRA_ANALYSIS_TYPE_VALUES),
                ]}
                value={(inputs.analysisType as string) ?? ""}
                onChange={(e) => setValue("analysisType", e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      {step.service === "mss" && (
        <>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className={fieldClass("dataType")}>
              <label className="block text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
                DDBJ データタイプ (DATATYPE)
              </label>
              <Select
                selectSize="sm"
                options={[
                  { value: "", label: "—" },
                  ...buildOptions(MSS_DATATYPE_VALUES),
                ]}
                value={(inputs.dataType as string) ?? ""}
                onChange={(e) => setValue("dataType", e.target.value)}
              />
            </div>
            <div className={fieldClass("division")}>
              <label className="block text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
                DIVISION
              </label>
              <Select
                selectSize="sm"
                options={[
                  { value: "", label: "—" },
                  ...buildOptions(MSS_DIVISION_VALUES),
                ]}
                value={(inputs.division as string) ?? ""}
                onChange={(e) => setValue("division", e.target.value)}
              />
            </div>
          </div>
          <div className={fieldClass("keywords")}>
            <label
              htmlFor={`step-input-keywords-${step.id}`}
              className="block text-[10px] font-semibold tracking-wide text-gray-500 uppercase"
            >
              KEYWORDS (INSDC methodological)
            </label>
            <select
              id={`step-input-keywords-${step.id}`}
              data-testid={`step-input-keywords-${step.id}`}
              multiple
              size={6}
              className="w-full rounded border border-gray-200 bg-white p-1 text-xs"
              value={parseKeywordsString(inputs.keywords)}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions).map(
                  (o) => o.value,
                )
                setValue("keywords", joinKeywords(selected))
              }}
            >
              {MSS_KEYWORDS_VOCABULARY.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] leading-snug text-gray-500">
              {t("routes.submitAlt3.flowStepCard.keywordsHint", {
                defaultValue:
                  "Ctrl/⌘ クリックで複数選択。Rule 7a の TPA 自動付与文字列は保持されます",
              })}
            </p>
          </div>
        </>
      )}

      {step.service === "dbcls-application" && (
        <div className={fieldClass("subgrpId")}>
          <label
            htmlFor={`step-input-subgrp-id-${step.id}`}
            className="block text-[10px] font-semibold tracking-wide text-gray-500 uppercase"
          >
            subgrp ID (DBCLS 申請ヘッダー)
          </label>
          <input
            id={`step-input-subgrp-id-${step.id}`}
            data-testid={`step-input-subgrp-id-${step.id}`}
            type="text"
            value={(inputs.subgrpId as string) ?? ""}
            placeholder="例: hum0001"
            className="w-full rounded border border-gray-200 bg-white px-2 py-1 text-xs"
            onChange={(e) => setValue("subgrpId", e.target.value)}
          />
          <p className="mt-1 text-[10px] leading-snug text-gray-500">
            {t("routes.submitAlt3.flowStepCard.subgrpIdHint", {
              defaultValue:
                "DBCLS から発番される subgrp ID を控えておくと、後続 JGA Step の controlled-access ID として参照できます",
            })}
          </p>
        </div>
      )}

      {step.service !== "dra" &&
        step.service !== "mss" &&
        step.service !== "dbcls-application" && (
        <p className="text-xs text-gray-500">
          {t("routes.submitAlt3.flowStepCard.noEditableInputs", {
            defaultValue:
                "この Step に編集可能な pulldown はまだありません (PoC スコープ)",
          })}
        </p>
      )}
    </div>
  )
}

export default StepInputPopover
