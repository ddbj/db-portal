import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  FileTableSection,
  FlowCardSection,
} from "@/components/submit-alt3"
import { Heading } from "@/components/ui"
import { pickLang } from "@/i18n"
import { resolveMeta } from "@/i18n/server"
import { PORTAL_ORIGIN } from "@/lib/portal-origin"
import {
  type AddFilePayload,
  generateFlowCard,
  submissionReducer,
} from "@/lib/submit-alt3"
import {
  type AccessRestriction,
  type ChipAxis,
  createEmptySubmission,
  type DataForm,
  type Organism,
  type ServiceKind,
  type Submission,
} from "@/types/submit-alt3"

import type { Route } from "./+types/submit-alt3"

export const loader = ({ request }: Route.LoaderArgs) => {
  const lang = pickLang(
    request.headers.get("Cookie"),
    request.headers.get("Accept-Language"),
  )
  const resource = resolveMeta(lang)

  return {
    lang,
    metaTitle: resource.routes.submitAlt3.meta.title,
    metaDescription: resource.routes.submitAlt3.meta.description,
  }
}

export const meta = ({ data }: Route.MetaArgs) => [
  { title: data?.metaTitle ?? "登録ナビゲーション v3 | DDBJ 刷新 (仮)" },
  { name: "description", content: data?.metaDescription ?? "" },
  { name: "robots", content: "index, follow" },
  { tagName: "link", rel: "canonical", href: `${PORTAL_ORIGIN}/submit-alt3` },
]

// Rule 14b 「chip を修正」操作: テーブル該当 chip cell に scroll + 一時的にハイライト
const focusChipCell = (fileId: string, axis: ChipAxis): void => {
  if (typeof window === "undefined") return
  const el = window.document.querySelector(
    `[data-testid="file-cell-chip-${fileId}-${axis}"]`,
  ) as HTMLElement | null
  if (!el) {
    // chip が存在しない場合は行全体にフォーカス
    const rowEl = window.document.querySelector(
      `[data-testid="file-row-${fileId}"]`,
    ) as HTMLElement | null
    rowEl?.scrollIntoView({ behavior: "smooth", block: "center" })

    return
  }
  el.scrollIntoView({ behavior: "smooth", block: "center" })
  el.classList.add("ring-2", "ring-rose-400", "ring-offset-2")
  window.setTimeout(() => {
    el.classList.remove("ring-2", "ring-rose-400", "ring-offset-2")
  }, 2000)
}

const SubmitAlt3 = () => {
  const { t } = useTranslation()
  const [submission, setSubmission] = useState<Submission>(
    createEmptySubmission,
  )

  const flowCard = useMemo(
    () => generateFlowCard(submission),
    [submission],
  )

  const handleAddFile = (payload: AddFilePayload) => {
    setSubmission((s) => submissionReducer(s, { type: "add-file", payload }))
  }

  const handleEditCell = (
    fileId: string,
    column: "organism" | "accessRestriction" | "dataForm",
    value: Organism | AccessRestriction | DataForm | undefined,
  ) => {
    setSubmission((s) =>
      submissionReducer(s, {
        type: "edit-cell",
        payload: { fileId, column, value, source: "user" },
      }),
    )
  }

  const handleRemoveFile = (fileId: string) => {
    setSubmission((s) =>
      submissionReducer(s, { type: "remove-file", payload: { fileId } }),
    )
  }

  const handleSetChip = (
    fileId: string,
    axis: ChipAxis,
    value: string | undefined,
    manualOverride?: boolean,
  ) => {
    setSubmission((s) =>
      submissionReducer(s, {
        type: "set-chip",
        payload: {
          fileId,
          axis,
          value,
          ...(manualOverride !== undefined ? { manualOverride } : {}),
        },
      }),
    )
  }

  const handleResetChipManual = (fileId: string, axis: ChipAxis) => {
    setSubmission((s) =>
      submissionReducer(s, {
        type: "reset-chip-manual",
        payload: { fileId, axis },
      }),
    )
  }

  const handleUpdateStepInput = (
    stepId: string,
    serviceKind: ServiceKind,
    values: Record<string, unknown>,
  ) => {
    setSubmission((s) =>
      submissionReducer(s, {
        type: "update-service-draft",
        payload: { stepId, serviceKind, values },
      }),
    )
  }

  const handleAcknowledgeWarning = (warningId: string) => {
    setSubmission((s) =>
      submissionReducer(s, {
        type: "dismiss-warning",
        payload: { warningId },
      }),
    )
  }

  const handleRestoreWarning = (warningId: string) => {
    setSubmission((s) =>
      submissionReducer(s, {
        type: "restore-warning",
        payload: { warningId },
      }),
    )
  }

  // Rule 14b: 「chip を修正」操作
  // suggestedValue が指定されていれば、その値で chip を即時更新 + cell に scroll
  const handleFocusChip = (
    fileId: string,
    axis: ChipAxis,
    suggestedValue?: string,
  ) => {
    if (suggestedValue !== undefined) {
      handleSetChip(fileId, axis, suggestedValue, true)
    }
    // DOM 更新後に scroll + ハイライト
    if (typeof window !== "undefined") {
      window.setTimeout(() => focusChipCell(fileId, axis), 50)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-12 px-6 py-12">
      <header className="text-center">
        <Heading
          level={1}
          className="text-3xl font-semibold tracking-wide text-gray-900"
        >
          {t("routes.submitAlt3.hero.title")}
        </Heading>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
          {t("routes.submitAlt3.hero.subtitle")}
        </p>
      </header>

      <FileTableSection
        submission={submission}
        onAddFile={handleAddFile}
        onEditCell={handleEditCell}
        onRemoveFile={handleRemoveFile}
        onSetChip={handleSetChip}
        onResetChipManual={handleResetChipManual}
      />

      <FlowCardSection
        flowCard={flowCard}
        hasFiles={submission.fileEntries.length > 0}
        onUpdateStepInput={handleUpdateStepInput}
        onAcknowledgeWarning={handleAcknowledgeWarning}
        onRestoreWarning={handleRestoreWarning}
        onFocusChip={handleFocusChip}
      />
    </div>
  )
}

export default SubmitAlt3
